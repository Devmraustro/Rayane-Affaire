import { z } from 'zod';
import { findByEmailWithHash, issuePasswordReset } from '@/lib/db/admin-users';
import { clientIp, fail, isSameOrigin, ok } from '@/lib/server/api';
import { consume, hashClientId } from '@/lib/server/rate-limit';
import { emailDeliveryConfigured, sendEmail } from '@/lib/server/email';
import { SITE_URL } from '@/lib/config';

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(160) });
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  const limit = consume(`forgot:${hashClientId(clientIp(request))}`, 5, 15 * 60_000);
  if (!limit.allowed) return fail('RATE_LIMITED', 'Too many attempts.', 429);
  let body: unknown; try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const parsed = schema.safeParse(body); if (!parsed.success) return fail('VALIDATION', 'Invalid e-mail.', 422);
  const record = findByEmailWithHash(parsed.data.email);
  if (record?.user.active && emailDeliveryConfigured()) {
    const reset = issuePasswordReset(record.user.id);
    const url = `${SITE_URL}/reset-password?token=${encodeURIComponent(reset.token)}`;
    try { await sendEmail({ to: record.user.email, subject: 'RAYANE AFFAIRE — réinitialisation du mot de passe', text: `Ce lien à usage unique expire dans 30 minutes :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.` }); }
    catch (error) { console.error('[auth] password-reset delivery failed', (error as Error).message); }
  }
  // The response is identical whether the account exists, is inactive, or mail
  // is unavailable: it cannot be used to enumerate administrator accounts.
  return ok({ accepted: true });
}
