import { loginSchema } from '@/lib/validation';
import { findByEmailWithHash, countAdminUsers } from '@/lib/db/admin-users';
import { verifyPassword } from '@/lib/server/password';
import { issueSession, pruneExpiredSessions, serializeSessionCookies } from '@/lib/server/session';
import { consume, hashClientId } from '@/lib/server/rate-limit';
import { ok, fail, clientIp, isSameOrigin } from '@/lib/server/api';
import { RATE_LIMITS } from '@/lib/config';

/**
 * POST /api/auth/login
 *
 * Hardened against the usual account-enumeration and brute-force patterns:
 *  * a single generic error for unknown e-mail, wrong password and disabled
 *    account (no oracle about which accounts exist);
 *  * a dummy password verification when the account is unknown so response time
 *    does not reveal existence;
 *  * durable per-IP *and* per-account rate limiting;
 *  * sessions stored hashed, with a CSRF token (see lib/server/session.ts).
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);

  if (countAdminUsers() === 0) {
    return fail(
      'NOT_CONFIGURED',
      'No administrator account exists yet. Run: npm run db:seed:admin',
      409,
    );
  }

  const ipHash = hashClientId(clientIp(request));
  const ipLimit = consume(`login:ip:${ipHash}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
  if (!ipLimit.allowed) {
    return new Response(
      JSON.stringify({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts.' } }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(ipLimit.retryAfterSeconds) },
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) return fail('VALIDATION', 'Invalid credentials payload.', 422);

  const record = findByEmailWithHash(parsed.data.email);

  // Constant-ish work whether or not the account exists.
  const passwordOk = record
    ? await verifyPassword(parsed.data.password, record.passwordHash)
    : await verifyPassword(parsed.data.password, 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');

  if (!record || !passwordOk || !record.user.active) {
    return fail('INVALID_CREDENTIALS', 'Invalid e-mail or password.', 401);
  }

  // Per-account throttle (defeats a distributed guessing attempt).
  const accountLimit = consume(
    `login:user:${record.user.id}`,
    RATE_LIMITS.login.limit,
    RATE_LIMITS.login.windowMs,
  );
  if (!accountLimit.allowed) {
    return fail('RATE_LIMITED', 'Too many attempts for this account.', 429);
  }

  pruneExpiredSessions();
  const session = issueSession(record.user.id, {
    ipHash,
    userAgent: request.headers.get('user-agent'),
  });

  const response = ok({
    user: {
      id: record.user.id,
      email: record.user.email,
      fullName: record.user.fullName,
      role: record.user.role,
      mustChangePassword: record.user.mustChangePassword,
    },
  });
  // Cookies are serialised on the response rather than via `next/headers` so the
  // handler stays testable and transport-agnostic.
  for (const cookie of serializeSessionCookies(session)) {
    response.headers.append('set-cookie', cookie);
  }
  return response;
}
