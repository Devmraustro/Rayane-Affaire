import { fieldErrors, placeWriteSchema } from '@/lib/validation';
import { createPlace } from '@/lib/db/admin-places';
import { ListingError } from '@/lib/db/admin-listings';
import { HttpError, requireAdmin } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, ok } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';

export async function POST(request: Request): Promise<Response> {
  let session;
  try { session = await requireAdmin('editor', credentialsFromRequest(request)); }
  catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }
  let body: unknown;
  try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const parsed = placeWriteSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION', 'Invalid place payload.', 422, fieldErrors(parsed.error));
  try {
    const place = createPlace(parsed.data);
    recordAudit(session, 'place.create', 'place', place.id, { reference: place.reference, locationStatus: place.locationStatus });
    return ok(place);
  } catch (error) {
    if (error instanceof ListingError) return fail(error.code, error.message, 422);
    console.error('[admin/places] create failed', error);
    return fail('SERVER_ERROR', 'Could not create the place.', 500);
  }
}
