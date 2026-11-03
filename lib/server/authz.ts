import '@/lib/server/guard';
import { cookies, headers } from 'next/headers';
import {
  getSession,
  resolveSessionToken,
  csrfEquals,
  type SessionContext,
} from './session';
import { AUTH_COOKIE, CSRF_HEADER } from '@/lib/config';
import type { AdminRole } from '@/types';

/**
 * Route-handler authorisation helpers.
 *
 * Two independent checks for every write:
 *  1. a valid session that is still in the database (not just a cookie), and
 *  2. a CSRF token matching the session row (double submit).
 * Role checks are layered on top for privileged operations.
 *
 * The `resolveSessionToken` / `checkCsrf` cores are exported so the authorisation
 * rules can be unit-tested against real sessions without a Next.js request
 * context; the `headers()`/`cookies()`-backed wrappers are thin adapters.
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const ROLE_RANK: Record<AdminRole, number> = { editor: 1, manager: 2, owner: 3 };

export function roleSatisfies(role: AdminRole, minRole: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

/** Validates a session resolved from a cookie value against a minimum role. */
export function assertSession(
  session: SessionContext | null,
  minRole: AdminRole = 'editor',
): SessionContext {
  if (!session) throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required.');
  if (!roleSatisfies(session.user.role, minRole)) {
    throw new HttpError(403, 'FORBIDDEN', 'Insufficient role.');
  }
  return session;
}

/** Constant-time CSRF comparison, independent of the request transport. */
export function checkCsrf(provided: string | null | undefined, expected: string): void {
  if (!provided || !csrfEquals(provided, expected)) {
    throw new HttpError(403, 'CSRF', 'Invalid or missing CSRF token.');
  }
}

/**
 * Credentials supplied explicitly instead of through Next.js cookies/headers.
 * Used by tests and by future non-browser clients; the cookie adapters below are
 * the only place that touches `next/headers`.
 */
export interface ExplicitCredentials {
  sessionToken?: string;
  csrfToken?: string;
}

export async function requireSession(
  minRole: AdminRole = 'editor',
  credentials?: ExplicitCredentials,
): Promise<SessionContext> {
  const session = credentials
    ? resolveSessionToken(credentials.sessionToken)
    : await getSession();
  return assertSession(session, minRole);
}

/** Verifies the double-submit CSRF token for mutating requests. */
export async function requireCsrf(
  session: SessionContext,
  credentials?: ExplicitCredentials,
): Promise<void> {
  if (credentials) {
    checkCsrf(credentials.csrfToken, session.csrfToken);
    return;
  }
  const headerList = await headers();
  checkCsrf(headerList.get(CSRF_HEADER), session.csrfToken);
}

/** Convenience wrapper: session + role + CSRF in one call. */
export async function requireAdmin(
  minRole: AdminRole = 'editor',
  credentials?: ExplicitCredentials,
): Promise<SessionContext> {
  const session = await requireSession(minRole, credentials);
  await requireCsrf(session, credentials);
  return session;
}

/** Read-only helper for Server Components that must not redirect on failure. */
export async function currentSession(): Promise<SessionContext | null> {
  return getSession();
}

/** Resolves a session from an explicit cookie value (tests, non-Next callers). */
export function sessionFromCookieValue(value: string | undefined): SessionContext | null {
  return resolveSessionToken(value);
}

/** Name of the session cookie, re-exported for tests and middleware. */
export const SESSION_COOKIE_NAME = AUTH_COOKIE;

/** Reads the session cookie directly (used by route handlers that own the jar). */
export async function sessionFromCookies(): Promise<SessionContext | null> {
  const jar = await cookies();
  return resolveSessionToken(jar.get(AUTH_COOKIE)?.value);
}

/** Error envelope shared by every admin route. */
export function errorResponse(error: unknown): { status: number; body: unknown } {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: { ok: false, error: { code: error.code, message: error.message } },
    };
  }
  return {
    status: 500,
    body: { ok: false, error: { code: 'INTERNAL', message: 'Unexpected server error.' } },
  };
}
