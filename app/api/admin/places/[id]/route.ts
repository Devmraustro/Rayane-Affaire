import { fieldErrors, placeWriteSchema } from '@/lib/validation';
import { deletePlace, setPlaceStatus, updatePlace } from '@/lib/db/admin-places';
import { ListingError } from '@/lib/db/admin-listings';
import { HttpError, requireAdmin } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, ok } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';
import { removeStoredFile } from '@/lib/server/upload';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  let session;
  try { session = await requireAdmin('editor', credentialsFromRequest(request)); }
  catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }
  const { id } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  try {
    if (body && typeof body === 'object' && 'statusOnly' in body) {
      const status = (body as { statusOnly?: unknown }).statusOnly;
      if (status !== 'draft' && status !== 'published' && status !== 'archived') return fail('VALIDATION', 'Invalid status.', 422);
      const place = setPlaceStatus(id, status);
      if (!place) return fail('NOT_FOUND', 'Place not found.', 404);
      recordAudit(session, 'place.status', 'place', id, { status });
      return ok(place);
    }
    const parsed = placeWriteSchema.safeParse(body);
    if (!parsed.success) return fail('VALIDATION', 'Invalid place payload.', 422, fieldErrors(parsed.error));
    const place = updatePlace(id, parsed.data);
    recordAudit(session, 'place.update', 'place', id, { locationStatus: place.locationStatus });
    return ok(place);
  } catch (error) {
    if (error instanceof ListingError) return fail(error.code, error.message, error.code === 'NOT_FOUND' ? 404 : 422);
    console.error('[admin/places] update failed', error);
    return fail('SERVER_ERROR', 'Could not update the place.', 500);
  }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  let session;
  try { session = await requireAdmin('manager', credentialsFromRequest(request)); }
  catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }
  const { id } = await context.params;
  const urls = deletePlace(id);
  if (!urls) return fail('NOT_FOUND', 'Place not found.', 404);
  for (const url of urls) removeStoredFile(url);
  recordAudit(session, 'place.delete', 'place', id);
  return ok({ deleted: true });
}
