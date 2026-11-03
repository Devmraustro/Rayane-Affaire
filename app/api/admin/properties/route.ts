import { propertyWriteSchema, fieldErrors } from '@/lib/validation';
import { createProperty, ListingError } from '@/lib/db/admin-listings';
import { requireAdmin, HttpError } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { ok, fail } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';

/** POST /api/admin/properties — create a listing. */
export async function POST(request: Request): Promise<Response> {
  let session;
  try {
    session = await requireAdmin('editor', credentialsFromRequest(request));
  } catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const parsed = propertyWriteSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION', 'Invalid property payload.', 422, fieldErrors(parsed.error));

  try {
    const property = createProperty(parsed.data);
    recordAudit(session, 'property.create', 'property', property.id, {
      reference: property.reference,
      status: property.status,
    });
    return ok(property);
  } catch (error) {
    if (error instanceof ListingError) return fail(error.code, error.message, 422);
    console.error('[admin/properties] create failed', error);
    return fail('SERVER_ERROR', 'Could not create the listing.', 500);
  }
}
