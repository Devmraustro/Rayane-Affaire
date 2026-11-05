import { z } from 'zod';
import { AccountError, deleteAdminUser, setAdminPassword, updateAdminAccount } from '@/lib/db/admin-users';
import { HttpError, requireAdmin } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, isSameOrigin, ok } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';
import { temporaryPassword } from '@/lib/server/password';

type Context = { params: Promise<{ id: string }> };
const schema = z.union([z.object({ role: z.enum(['owner','manager','editor']).optional(), active: z.boolean().optional() }).refine((value) => value.role !== undefined || value.active !== undefined), z.object({ resetPassword: z.literal(true) })]);
export async function PATCH(request: Request, context: Context): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  let session; try { session = await requireAdmin('owner', credentialsFromRequest(request)); } catch (error) { if (error instanceof HttpError) return fail(error.code, error.message, error.status); return fail('UNAUTHORIZED', 'Authentication required.', 401); }
  let body: unknown; try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const parsed = schema.safeParse(body); if (!parsed.success) return fail('VALIDATION', 'Invalid account payload.', 422);
  const id = (await context.params).id;
  try {
    if ('resetPassword' in parsed.data) {
      const password = temporaryPassword(); await setAdminPassword(id, password, true);
      recordAudit(session, 'account.password.reset', 'admin_user', id);
      return ok({ reset: true, temporaryPassword: password });
    }
    const user = updateAdminAccount(session.user.id, id, parsed.data);
    recordAudit(session, 'account.update', 'admin_user', id, { role: user.role, active: user.active });
    return ok({ user });
  } catch (error) {
    if (error instanceof AccountError) return fail(error.code, error.message, error.code === 'NOT_FOUND' ? 404 : 422);
    return fail('SERVER_ERROR', 'Could not update the account.', 500);
  }
}
export async function DELETE(request: Request, context: Context): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  let session; try { session = await requireAdmin('owner', credentialsFromRequest(request)); } catch (error) { if (error instanceof HttpError) return fail(error.code, error.message, error.status); return fail('UNAUTHORIZED', 'Authentication required.', 401); }
  const id = (await context.params).id;
  try { deleteAdminUser(session.user.id, id); recordAudit(session, 'account.delete', 'admin_user', id); return ok({ deleted: true }); }
  catch (error) { if (error instanceof AccountError) return fail(error.code, error.message, error.code === 'NOT_FOUND' ? 404 : 422); return fail('SERVER_ERROR', 'Could not delete the account.', 500); }
}
