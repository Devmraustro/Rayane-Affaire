import { customerWriteSchema, fieldErrors } from '@/lib/validation';
import { upsertCustomerByPhone } from '@/lib/db/customers';
import { HttpError, requireAdmin } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, isSameOrigin, ok } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  let session; try { session = await requireAdmin('editor', credentialsFromRequest(request)); } catch (error) { if (error instanceof HttpError) return fail(error.code, error.message, error.status); return fail('UNAUTHORIZED', 'Authentication required.', 401); }
  let body: unknown; try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const parsed = customerWriteSchema.safeParse(body); if (!parsed.success) return fail('VALIDATION', 'Invalid customer payload.', 422, fieldErrors(parsed.error));
  const customer = upsertCustomerByPhone(parsed.data); recordAudit(session, 'customer.upsert', 'customer', customer.id); return ok(customer);
}
