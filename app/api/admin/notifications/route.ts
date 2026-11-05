import { z } from 'zod';
import { updateNotificationPreferences } from '@/lib/db/admin-users';
import { HttpError, requireAdmin } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, isSameOrigin, ok } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';
import { emailDeliveryConfigured } from '@/lib/server/email';
const schema = z.object({ notificationEmail: z.union([z.string().trim().toLowerCase().email().max(160), z.literal('')]), notifyNewInquiry: z.boolean(), notifyReservation: z.boolean() });
export async function PATCH(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  let session; try { session = await requireAdmin('editor', credentialsFromRequest(request)); } catch (error) { if (error instanceof HttpError) return fail(error.code, error.message, error.status); return fail('UNAUTHORIZED', 'Authentication required.', 401); }
  let body: unknown; try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const parsed = schema.safeParse(body); if (!parsed.success) return fail('VALIDATION', 'Invalid notification preferences.', 422);
  const user = updateNotificationPreferences(session.user.id, { ...parsed.data, notificationEmail: parsed.data.notificationEmail || null });
  recordAudit(session, 'account.notifications', 'admin_user', session.user.id, { notifyNewInquiry: user.notifyNewInquiry, notifyReservation: user.notifyReservation });
  return ok({ user, emailConfigured: emailDeliveryConfigured() });
}
