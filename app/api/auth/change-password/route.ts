import { z } from 'zod';
import { AccountError, changeOwnPassword } from '@/lib/db/admin-users';
import { HttpError, requireSession, requireCsrf } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, isSameOrigin, ok } from '@/lib/server/api';
import { validatePasswordStrength } from '@/lib/server/password';
import { recordAudit } from '@/lib/server/audit';

const schema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(12).max(200) });
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  let session;
  try {
    const credentials = credentialsFromRequest(request);
    session = await requireSession('editor', credentials, { allowPasswordChange: true });
    await requireCsrf(session, credentials);
  } catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }
  let body: unknown; try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const parsed = schema.safeParse(body); if (!parsed.success) return fail('VALIDATION', 'Invalid password payload.', 422);
  const strength = validatePasswordStrength(parsed.data.newPassword); if (strength) return fail('WEAK_PASSWORD', strength, 422);
  try {
    await changeOwnPassword(session.user.id, parsed.data.currentPassword, parsed.data.newPassword, session.sessionId);
    // Refresh the resolved session's user state for subsequent rendering.
    session.user.mustChangePassword = false;
    recordAudit(session, 'account.password.change', 'admin_user', session.user.id);
    return ok({ changed: true });
  } catch (error) {
    if (error instanceof AccountError) return fail(error.code, error.message, error.code === 'INVALID_CURRENT_PASSWORD' ? 403 : 422);
    return fail('SERVER_ERROR', 'Could not change the password.', 500);
  }
}
