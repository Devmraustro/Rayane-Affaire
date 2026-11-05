import { z } from 'zod';
import { consumePasswordReset } from '@/lib/db/admin-users';
import { fail, isSameOrigin, ok } from '@/lib/server/api';
import { validatePasswordStrength } from '@/lib/server/password';
import { consume, hashClientId } from '@/lib/server/rate-limit';
import { clientIp } from '@/lib/server/api';

const schema = z.object({ token: z.string().min(20).max(200), password: z.string().min(12).max(200) });
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  const limit = consume(`reset:${hashClientId(clientIp(request))}`, 8, 15 * 60_000);
  if (!limit.allowed) return fail('RATE_LIMITED', 'Too many attempts.', 429);
  let body: unknown; try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const parsed = schema.safeParse(body); if (!parsed.success) return fail('VALIDATION', 'Invalid reset payload.', 422);
  const strength = validatePasswordStrength(parsed.data.password); if (strength) return fail('WEAK_PASSWORD', strength, 422);
  const user = await consumePasswordReset(parsed.data.token, parsed.data.password);
  if (!user) return fail('INVALID_RESET_TOKEN', 'This reset link is invalid, used or expired.', 400);
  return ok({ reset: true });
}
