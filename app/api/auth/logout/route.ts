import { clearSessionCookies, revokeFromRequest } from '@/lib/server/session';
import { ok, fail, isSameOrigin } from '@/lib/server/api';

/**
 * POST /api/auth/logout — revokes the session row in the database and clears
 * both cookies. Revoking server-side matters: a copied cookie stops working
 * immediately, unlike a cookie-only "logout".
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  revokeFromRequest(request);
  const response = ok({ signedOut: true });
  for (const cookie of clearSessionCookies()) {
    response.headers.append('set-cookie', cookie);
  }
  return response;
}
