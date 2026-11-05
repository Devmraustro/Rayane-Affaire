import '@/lib/server/guard';
import { getDb, transaction } from '@/db/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword } from '@/lib/server/password';
import { sessionSecret } from '@/lib/server/env';
import type { AdminRole, AdminUser } from '@/types';

interface AdminRow {
  id: string; email: string; password_hash: string; full_name: string;
  role: AdminRole; active: number; must_change_password: number;
  notification_email: string | null; notify_new_inquiry: number; notify_reservation: number;
  last_login_at: string | null; created_at: string;
}

export class AccountError extends Error { constructor(public code: string, message: string) { super(message); } }

function toAdminUser(row: AdminRow): AdminUser {
  return {
    id: row.id, email: row.email, fullName: row.full_name, role: row.role,
    active: row.active === 1, mustChangePassword: row.must_change_password === 1,
    notificationEmail: row.notification_email, notifyNewInquiry: row.notify_new_inquiry === 1,
    notifyReservation: row.notify_reservation === 1,
    lastLoginAt: row.last_login_at, createdAt: row.created_at,
  };
}

export function countAdminUsers(): number {
  return (getDb().prepare('SELECT COUNT(*) AS n FROM admin_users').get() as { n: number }).n;
}

export function findByEmailWithHash(email: string): { user: AdminUser; passwordHash: string } | null {
  const row = getDb().prepare('SELECT * FROM admin_users WHERE email = ?').get(email.trim().toLowerCase()) as AdminRow | undefined;
  return row ? { user: toAdminUser(row), passwordHash: row.password_hash } : null;
}

export function getAdminUserById(id: string): AdminUser | null {
  const row = getDb().prepare('SELECT * FROM admin_users WHERE id = ?').get(id) as AdminRow | undefined;
  return row ? toAdminUser(row) : null;
}

export async function createAdminUser(input: {
  email: string; password: string; fullName: string; role: AdminRole;
  mustChangePassword?: boolean; notificationEmail?: string | null;
}): Promise<AdminUser> {
  const db = getDb(); const id = randomUUID(); const now = new Date().toISOString();
  const passwordHash = await hashPassword(input.password);
  try {
    db.prepare(`INSERT INTO admin_users (id, email, password_hash, full_name, role, active,
      must_change_password, notification_email, notify_new_inquiry, notify_reservation,
      last_login_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0, 0, NULL, ?, ?)`)
      .run(id, input.email.trim().toLowerCase(), passwordHash, input.fullName.trim(), input.role,
        input.mustChangePassword ? 1 : 0, input.notificationEmail?.trim().toLowerCase() || null, now, now);
  } catch (error) {
    if (String((error as Error).message).includes('UNIQUE')) throw new AccountError('EMAIL_TAKEN', 'An account already uses this e-mail.');
    throw error;
  }
  return getAdminUserById(id) as AdminUser;
}

export function listAdminUsers(): AdminUser[] {
  return (getDb().prepare('SELECT * FROM admin_users ORDER BY created_at ASC').all() as unknown as AdminRow[]).map(toAdminUser);
}

function assertOwnerRemainder(target: AdminRow, nextRole: AdminRole, nextActive: boolean): void {
  if (target.role !== 'owner' || (nextRole === 'owner' && nextActive)) return;
  const owners = (getDb().prepare(`SELECT COUNT(*) AS n FROM admin_users WHERE role='owner' AND active=1`).get() as { n: number }).n;
  if (owners <= 1) throw new AccountError('LAST_OWNER', 'The last active owner cannot be demoted, deactivated or deleted.');
}

export function updateAdminAccount(actorId: string, targetId: string, input: { role?: AdminRole; active?: boolean }): AdminUser {
  const db = getDb();
  return transaction(db, () => {
    const target = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(targetId) as AdminRow | undefined;
    if (!target) throw new AccountError('NOT_FOUND', 'Account not found.');
    const role = input.role ?? target.role; const active = input.active ?? target.active === 1;
    if (actorId === targetId && (role !== target.role || !active)) throw new AccountError('SELF_LOCKOUT', 'You cannot demote or deactivate your own account.');
    assertOwnerRemainder(target, role, active);
    db.prepare('UPDATE admin_users SET role=?, active=?, updated_at=? WHERE id=?')
      .run(role, active ? 1 : 0, new Date().toISOString(), targetId);
    if (!active || role !== target.role) db.prepare('DELETE FROM admin_sessions WHERE user_id=?').run(targetId);
    return getAdminUserById(targetId) as AdminUser;
  });
}

export function deleteAdminUser(actorId: string, targetId: string): void {
  const db = getDb();
  transaction(db, () => {
    const target = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(targetId) as AdminRow | undefined;
    if (!target) throw new AccountError('NOT_FOUND', 'Account not found.');
    if (actorId === targetId) throw new AccountError('SELF_DELETE', 'Use a different owner account to delete an owner; self-deletion is disabled.');
    assertOwnerRemainder(target, target.role, false);
    db.prepare('DELETE FROM admin_sessions WHERE user_id=?').run(targetId);
    db.prepare('DELETE FROM admin_users WHERE id=?').run(targetId);
  });
}

export async function setAdminPassword(targetId: string, password: string, mustChangePassword: boolean): Promise<void> {
  const passwordHash = await hashPassword(password); const db = getDb();
  const result = db.prepare('UPDATE admin_users SET password_hash=?, must_change_password=?, updated_at=? WHERE id=?')
    .run(passwordHash, mustChangePassword ? 1 : 0, new Date().toISOString(), targetId);
  if (!result.changes) throw new AccountError('NOT_FOUND', 'Account not found.');
  db.prepare('DELETE FROM admin_sessions WHERE user_id=?').run(targetId);
}

export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string, keepSessionId: string): Promise<void> {
  const row = getDb().prepare('SELECT password_hash FROM admin_users WHERE id=? AND active=1').get(userId) as { password_hash: string } | undefined;
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) throw new AccountError('INVALID_CURRENT_PASSWORD', 'The current password is incorrect.');
  const passwordHash = await hashPassword(newPassword);
  getDb().prepare('UPDATE admin_users SET password_hash=?, must_change_password=0, updated_at=? WHERE id=?')
    .run(passwordHash, new Date().toISOString(), userId);
  getDb().prepare('DELETE FROM admin_sessions WHERE user_id=? AND id<>?').run(userId, keepSessionId);
}

export function updateNotificationPreferences(userId: string, input: { notificationEmail: string | null; notifyNewInquiry: boolean; notifyReservation: boolean }): AdminUser {
  getDb().prepare(`UPDATE admin_users SET notification_email=?, notify_new_inquiry=?, notify_reservation=?, updated_at=? WHERE id=?`)
    .run(input.notificationEmail, input.notifyNewInquiry ? 1 : 0, input.notifyReservation ? 1 : 0, new Date().toISOString(), userId);
  const user = getAdminUserById(userId); if (!user) throw new AccountError('NOT_FOUND', 'Account not found.'); return user;
}

export function notificationRecipients(kind: 'inquiry' | 'reservation'): AdminUser[] {
  const column = kind === 'inquiry' ? 'notify_new_inquiry' : 'notify_reservation';
  return (getDb().prepare(`SELECT * FROM admin_users WHERE active=1 AND notification_email IS NOT NULL AND ${column}=1`).all() as unknown as AdminRow[]).map(toAdminUser);
}

function resetHash(token: string): string { return createHash('sha256').update(`${token}.${sessionSecret()}`).digest('hex'); }

export function issuePasswordReset(userId: string): { token: string; expiresAt: Date } {
  const db = getDb(); const token = randomBytes(32).toString('base64url');
  const now = new Date(); const expiresAt = new Date(now.getTime() + 30 * 60_000);
  transaction(db, () => {
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id=? OR expires_at<?').run(userId, now.toISOString());
    db.prepare(`INSERT INTO password_reset_tokens (id,user_id,token_hash,expires_at,used_at,created_at) VALUES (?,?,?,?,NULL,?)`)
      .run(randomUUID(), userId, resetHash(token), expiresAt.toISOString(), now.toISOString());
  });
  return { token, expiresAt };
}

export async function consumePasswordReset(token: string, newPassword: string): Promise<AdminUser | null> {
  const passwordHash = await hashPassword(newPassword); const db = getDb(); const now = new Date().toISOString();
  return transaction(db, () => {
    const row = db.prepare(`SELECT * FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>=?`)
      .get(resetHash(token), now) as { id: string; user_id: string } | undefined;
    if (!row) return null;
    const changed = db.prepare('UPDATE password_reset_tokens SET used_at=? WHERE id=? AND used_at IS NULL').run(now, row.id);
    if (!changed.changes) return null;
    db.prepare('UPDATE admin_users SET password_hash=?, must_change_password=0, updated_at=? WHERE id=?')
      .run(passwordHash, now, row.user_id);
    db.prepare('DELETE FROM admin_sessions WHERE user_id=?').run(row.user_id);
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id=?').run(row.user_id);
    return getAdminUserById(row.user_id);
  });
}
