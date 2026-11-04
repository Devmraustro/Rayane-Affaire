import { propertyWriteSchema, fieldErrors } from '@/lib/validation';
import {
  updateProperty,
  deleteProperty,
  setPropertyStatus,
  ListingError,
} from '@/lib/db/admin-listings';
import { requireAdmin, HttpError } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { ok, fail } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';

type Context = { params: Promise<{ id: string }> };

function handleAuthError(error: unknown): Response | null {
  if (error instanceof HttpError) return fail(error.code, error.message, error.status);
  return null;
}

/** PATCH /api/admin/properties/:id — update, or change status only. */
export async function PATCH(request: Request, context: Context): Promise<Response> {
  let session;
  try {
    session = await requireAdmin('editor', credentialsFromRequest(request));
  } catch (error) {
    return handleAuthError(error) ?? fail('UNAUTHORIZED', 'Authentication required.', 401);
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  // Status-only transition (used by the list view's publish/archive buttons).
  if (body && typeof body === 'object' && 'statusOnly' in body) {
    const status = (body as { statusOnly?: unknown }).statusOnly;
    if (status !== 'draft' && status !== 'published' && status !== 'archived') {
      return fail('VALIDATION', 'Invalid status.', 422);
    }
    try {
      const updated = setPropertyStatus(id, status);
      if (!updated) return fail('NOT_FOUND', 'Property not found.', 404);
      recordAudit(session, 'property.status', 'property', id, { status });
      return ok(updated);
    } catch (error) {
      if (error instanceof ListingError) return fail(error.code, error.message, 422);
      throw error;
    }
  }

  const parsed = propertyWriteSchema.safeParse(body);
  if (!parsed.success) return fail('VALIDATION', 'Invalid property payload.', 422, fieldErrors(parsed.error));

  try {
    const updated = updateProperty(id, parsed.data);
    recordAudit(session, 'property.update', 'property', id);
    return ok(updated);
  } catch (error) {
    if (error instanceof ListingError) {
      return fail(error.code, error.message, error.code === 'NOT_FOUND' ? 404 : 422);
    }
    console.error('[admin/properties] update failed', error);
    return fail('SERVER_ERROR', 'Could not update the listing.', 500);
  }
}

/** DELETE /api/admin/properties/:id — owner/manager only. */
export async function DELETE(request: Request, context: Context): Promise<Response> {
  let session;
  try {
    session = await requireAdmin('manager', credentialsFromRequest(request));
  } catch (error) {
    return handleAuthError(error) ?? fail('UNAUTHORIZED', 'Authentication required.', 401);
  }

  const { id } = await context.params;
  const deleted = deleteProperty(id);
  if (!deleted) return fail('NOT_FOUND', 'Property not found.', 404);
  recordAudit(session, 'property.delete', 'property', id);
  return ok({ deleted: true });
}
