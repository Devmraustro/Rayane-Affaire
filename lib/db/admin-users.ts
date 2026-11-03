import '@/lib/server/guard';
import { getDb } from '@/db/client';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '@/lib/server/password';
import type { AdminRole, AdminUser } from '@/types';

interface AdminRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: AdminRole;
  active: number;
  last_login_at: string | null;
  created_at: string;
}

function toAdminUser(row: AdminRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    active: row.active === 1,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

export function countAdminUsers(): number {
  return (getDb().prepare('SELECT COUNT(*) AS n FROM admin_users').get() as { n: number }).n;
}

export function findByEmailWithHash(
  email: string,
): { user: AdminUser; passwordHash: string } | null {
  const row = getDb()
    .prepare('SELECT * FROM admin_users WHERE email = ?')
    .get(email.trim().toLowerCase()) as AdminRow | undefined;
  if (!row) return null;
  return { user: toAdminUser(row), passwordHash: row.password_hash };
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: AdminRole;
}): Promise<AdminUser> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(input.password);
  db.prepare(
    `INSERT INTO admin_users (id, email, password_hash, full_name, role, active, last_login_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, NULL, ?, ?)`,
  ).run(
    id,
    input.email.trim().toLowerCase(),
    passwordHash,
    input.fullName,
    input.role,
    now,
    now,
  );
  return {
    id,
    email: input.email.trim().toLowerCase(),
    fullName: input.fullName,
    role: input.role,
    active: true,
    lastLoginAt: null,
    createdAt: now,
  };
}

export function listAdminUsers(): AdminUser[] {
  const rows = getDb()
    .prepare('SELECT * FROM admin_users ORDER BY created_at ASC')
    .all() as unknown as AdminRow[];
  return rows.map(toAdminUser);
}
