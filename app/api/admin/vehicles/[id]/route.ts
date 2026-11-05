import { vehicleWriteSchema, fieldErrors } from '@/lib/validation';
import { updateVehicle, deleteVehicle, setVehicleStatus, ListingError } from '@/lib/db/admin-listings';
import { requireAdmin, HttpError } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { ok, fail } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';
import { mediaUrlsForEntity } from '@/lib/db/media';
import { removeStoredFile } from '@/lib/server/upload';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
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

  if (body && typeof body === 'object' && 'statusOnly' in body) {
    const status = (body as { statusOnly?: unknown }).statusOnly;
    if (status !== 'draft' && status !== 'published' && status !== 'archived') {
      return fail('VALIDATION', 'Invalid status.', 422);
    }
    try {
      const updated = setVehicleStatus(id, status);
      if (!updated) return fail('NOT_FOUND', 'Vehicle not found.', 404);
      recordAudit(session, 'vehicle.status', 'vehicle', id, { status });
      return ok(updated);
    } catch (error) {
      if (error instanceof ListingError) return fail(error.code, error.message, 422);
      throw error;
    }
  }

  const parsed = vehicleWriteSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION', 'Invalid vehicle payload.', 422, fieldErrors(parsed.error));

  try {
    const updated = updateVehicle(id, parsed.data);
    recordAudit(session, 'vehicle.update', 'vehicle', id);
    return ok(updated);
  } catch (error) {
    if (error instanceof ListingError) {
      return fail(error.code, error.message, error.code === 'NOT_FOUND' ? 404 : 422);
    }
    console.error('[admin/vehicles] update failed', error);
    return fail('SERVER_ERROR', 'Could not update the vehicle.', 500);
  }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  let session;
  try {
    session = await requireAdmin('manager', credentialsFromRequest(request));
  } catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }
  const { id } = await context.params;
  const urls = mediaUrlsForEntity('vehicle', id);
  if (!deleteVehicle(id)) return fail('NOT_FOUND', 'Vehicle not found.', 404);
  for (const url of urls) removeStoredFile(url);
  recordAudit(session, 'vehicle.delete', 'vehicle', id);
  return ok({ deleted: true });
}
