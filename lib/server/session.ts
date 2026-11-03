import '@/lib/server/guard';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from '@/db/client';
import { sessionSecret } from './env';
import { AUTH_COOKIE, CSRF_COOKIE } from '@/lib/config';
import type { AdminRole, AdminUser } from '@/types';

/**
 * Server-side session management.
 *
 * Design decisions (see docs/SECURITY_AUDIT.md):
 *  * The cookie holds a 256-bit random token. The database stores only its
 *    SHA-256 hash, so a database dump cannot be replayed as a live session.
 *  * Sessions have an absolute expiry (8 h) and are revoked explicitly on logout.
 *  * CSRF uses the double-submit pattern: the CSRF token lives in the session
 *    row and is mirrored in a readable cookie; mutating requests must echo it in
 *    the `x-ra-csrf` header. A cross-site form cannot read the cookie.
 *  * Cookies are HttpOnly (except the CSRF one, by design), SameSite=Lax and
 *    Secure in production.
 */

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface SessionRow {
  id: string;
  user_id: string;
  csrf_token: string;
  expires_at: string;
  email: string;
  full_name: string;
  role: AdminRole;
  active: number;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Keyed hash so a stolen token hash alone is not enough to forge sessions. */
function hashToken(token: string): string {
  return sha256(`${token}.${sessionSecret()}`);
}

export interface SessionContext {
  user: AdminUser;
  csrfToken: string;
  sessionId: string;
}

export interface IssuedSession {
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

/**
 * Issues a session row and returns the credentials to hand to the client.
 *
 * Cookie writing is deliberately NOT done here: the HTTP route owns transport
 * concerns, which keeps this function callable from tests and future non-cookie
 * clients (mobile app, CLI) without mocking `next/headers`.
 */
export function issueSession(
  userId: string,
  meta: { ipHash?: string | null; userAgent?: string | null } = {},
): IssuedSession {
  const db = getDb();
  const token = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(24).toString('base64url');
  const id = randomBytes(16).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  db.prepare(
    `INSERT INTO admin_sessions (id, user_id, token_hash, csrf_token, expires_at, created_at, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    hashToken(token),
    csrfToken,
    expiresAt.toISOString(),
    now.toISOString(),
    meta.ipHash ?? null,
    meta.userAgent?.slice(0, 255) ?? null,
  );

  db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?').run(now.toISOString(), userId);

  return { token, csrfToken, expiresAt };
}

/** Session attributes applied to both admin cookies. */
export function sessionCookieOptions(expiresAt: Date) {
  return {
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  };
}

/**
 * Serialises a cookie pair for a plain `Response`.
 *
 * Used by the auth routes instead of `next/headers`, so the same handler works
 * under a normal Next.js request *and* under a direct call in tests (where no
 * request store exists). Same attributes as `sessionCookieOptions`.
 */
export function serializeSessionCookies(issued: IssuedSession): string[] {
  const options = sessionCookieOptions(issued.expiresAt);
  const base = `Path=${options.path}; Expires=${options.expires.toUTCString()}; SameSite=Lax`;
  const secure = options.secure ? '; Secure' : '';
  return [
    `${AUTH_COOKIE}=${issued.token}; ${base}; HttpOnly${secure}`,
    `${CSRF_COOKIE}=${issued.csrfToken}; ${base}${secure}`,
  ];
}

/** Clears both auth cookies on a plain `Response`. */
export function clearSessionCookies(): string[] {
  const expired = 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return [
    `${AUTH_COOKIE}=; ${expired}; HttpOnly${secure}`,
    `${CSRF_COOKIE}=; ${expired}${secure}`,
  ];
}

/** Issues a session AND sets the cookies on the current Next.js response. */
export async function createSession(
  userId: string,
  meta: { ipHash?: string | null; userAgent?: string | null } = {},
): Promise<IssuedSession> {
  const issued = issueSession(userId, meta);
  const jar = await cookies();
  const options = sessionCookieOptions(issued.expiresAt);
  jar.set(AUTH_COOKIE, issued.token, { ...options, httpOnly: true });
  // Readable by the admin UI only so it can echo the value back in a header.
  jar.set(CSRF_COOKIE, issued.csrfToken, { ...options, httpOnly: false });
  return issued;
}

/** Resolves a raw session token (from a cookie) to a live session, or null. */
export function resolveSessionToken(token: string | undefined | null): SessionContext | null {
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.id, s.user_id, s.csrf_token, s.expires_at,
              u.email, u.full_name, u.role, u.active
         FROM admin_sessions s
         JOIN admin_users u ON u.id = s.user_id
        WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as SessionRow | undefined;

  if (!row) return null;
  if (row.active !== 1) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    // Reap the stale row so the table does not accumulate dead sessions.
    db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(row.id);
    return null;
  }

  return {
    user: {
      id: row.user_id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      active: true,
      lastLoginAt: null,
      createdAt: '',
    },
    csrfToken: row.csrf_token,
    sessionId: row.id,
  };
}

/** Revokes one session by its raw token. Returns true when a row was removed. */
export function revokeSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const result = getDb().prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashToken(token));
  return result.changes > 0;
}

/** Resolves the current session from the request cookies, or null. */
export async function getSession(): Promise<SessionContext | null> {
  const jar = await cookies();
  return resolveSessionToken(jar.get(AUTH_COOKIE)?.value);
}

/**
 * Revokes the session identified by an explicit request (no `cookies()` call).
 * The logout route uses this so it works in tests and in any runtime.
 */
export function revokeFromRequest(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === AUTH_COOKIE) return revokeSessionToken(rest.join('='));
  }
  return false;
}

/** Revokes the session referenced by the request cookie, then clears the jar. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  revokeSessionToken(token);
  jar.delete(AUTH_COOKIE);
  jar.delete(CSRF_COOKIE);
}

/** Removes expired rows; called opportunistically on login. */
export function pruneExpiredSessions(): void {
  getDb()
    .prepare('DELETE FROM admin_sessions WHERE expires_at < ?')
    .run(new Date().toISOString());
}

/* -------------------------------------------------------------------------- */
/* CSRF                                                                       */
/* -------------------------------------------------------------------------- */

export function csrfEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
