import { inquirySchema, fieldErrors } from '@/lib/validation';
import { createInquiry } from '@/lib/db/inquiries';
import { consume, hashClientId } from '@/lib/server/rate-limit';
import { ok, fail, clientIp, isSameOrigin } from '@/lib/server/api';
import { RATE_LIMITS } from '@/lib/config';
import { notifyAdministrators } from '@/lib/server/notifications';

/**
 * POST /api/inquiries — public lead capture.
 *
 * Protections: same-origin check, durable per-IP rate limit, honeypot, strict
 * Zod validation, server-side sanitisation, and listing ids re-verified against
 * the database before being stored.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return fail('FORBIDDEN', 'Cross-origin submission rejected.', 403);
  }

  const ipHash = hashClientId(clientIp(request));
  const limit = consume(`inquiry:${ipHash}`, RATE_LIMITS.inquiry.limit, RATE_LIMITS.inquiry.windowMs);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: { code: 'RATE_LIMITED', message: 'Too many submissions. Please retry later.' },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(limit.retryAfterSeconds),
        },
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const parsed = inquirySchema.safeParse(payload);
  if (!parsed.success) {
    return fail('VALIDATION', 'Invalid inquiry payload.', 422, fieldErrors(parsed.error));
  }

  // Honeypot filled → behave like success (do not train the bot) but store nothing.
  if (parsed.data.website) {
    return ok({ received: true });
  }

  try {
    const inquiry = createInquiry(parsed.data, {
      ipHash,
      userAgent: request.headers.get('user-agent')?.slice(0, 255) ?? null,
    });
    await notifyAdministrators('inquiry', 'RAYANE AFFAIRE — nouvelle demande', `Une nouvelle demande ${inquiry.id} est disponible dans /admin/inquiries.`);
    return ok({ received: true, id: inquiry.id });
  } catch (error) {
    console.error('[inquiries] create failed', error);
    return fail('SERVER_ERROR', 'Could not record the inquiry.', 500);
  }
}
