import '@/lib/server/guard';
import { AUTH_COOKIE, CSRF_COOKIE, CSRF_HEADER } from '@/lib/config';
import type { ExplicitCredentials } from './authz';

/**
 * Extracts admin credentials from the incoming request itself.
 *
 * Route handlers call this and pass the result to `requireAdmin(minRole, creds)`,
 * which keeps the authorisation rules free of `next/headers`. That matters for
 * two reasons:
 *  * the same rules can be unit-tested against a real database without mocking
 *    the Next.js request context;
 *  * a future mobile/CLI client can authenticate with the same header instead of
 *    a browser cookie jar.
 *
 * The CSRF value is read from the `x-ra-csrf` header, falling back to the
 * double-submit cookie only when the header is absent (harmless: a cross-site
 * attacker can send neither).
 */
export function credentialsFromRequest(request: Request): ExplicitCredentials {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const jar = new Map<string, string>();
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    jar.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return {
    sessionToken: jar.get(AUTH_COOKIE),
    csrfToken: request.headers.get(CSRF_HEADER) ?? jar.get(CSRF_COOKIE),
  };
}
