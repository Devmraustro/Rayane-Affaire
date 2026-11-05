import { z } from 'zod';
import { temporaryPassword } from '@/lib/server/password';
import { AccountError, createAdminUser } from '@/lib/db/admin-users';
import { HttpError, requireAdmin } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, isSameOrigin, ok } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(160), fullName: z.string().trim().min(3).max(100), role: z.enum(['owner','manager','editor']) });
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  let session; try { session = await requireAdmin('owner', credentialsFromRequest(request)); } catch (error) { if (error instanceof HttpError) return fail(error.code, error.message, error.status); return fail('UNAUTHORIZED', 'Authentication required.', 401); }
  let body: unknown; try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const parsed = schema.safeParse(body); if (!parsed.success) return fail('VALIDATION', 'Invalid account payload.', 422);
  const password = temporaryPassword();
  try {
    const user = await createAdminUser({ ...parsed.data, password, mustChangePassword: true, notificationEmail: parsed.data.email });
    recordAudit(session, 'account.create', 'admin_user', user.id, { role: user.role });
    return ok({ user, temporaryPassword: password });
  } catch (error) {
    if (error instanceof AccountError) return fail(error.code, error.message, 422);
    return fail('SERVER_ERROR', 'Could not create the account.', 500);
  }
}
