import { z } from 'zod';
import { updateInquiry } from '@/lib/db/inquiries';
import { requireAdmin, HttpError } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { ok, fail } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';

const patchSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'won', 'lost', 'spam']).optional(),
  adminNotes: z.string().max(4000).optional(),
});

/** PATCH /api/admin/inquiries/:id — progress a lead through the funnel. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  let session;
  try {
    session = await requireAdmin('editor', credentialsFromRequest(request));
  } catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION', 'Invalid payload.', 422);

  const updated = updateInquiry(id, parsed.data);
  if (!updated) return fail('NOT_FOUND', 'Inquiry not found.', 404);
  recordAudit(session, 'inquiry.update', 'inquiry', id, parsed.data);
  return ok(updated);
}
