import { requireAdmin, HttpError } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { storeImage, UploadError } from '@/lib/server/upload';
import { addMedia, deleteMedia } from '@/lib/db/media';
import { consume, hashClientId } from '@/lib/server/rate-limit';
import { clientIp, ok, fail } from '@/lib/server/api';
import { RATE_LIMITS, UPLOAD } from '@/lib/config';
import { recordAudit } from '@/lib/server/audit';

/**
 * POST /api/admin/media — upload listing photographs (multipart).
 *
 * Auth + CSRF, per-IP rate limit, magic-byte validation, size cap, and an
 * ownership check so a media row can only be attached to a listing id that
 * actually exists.
 */
export async function POST(request: Request): Promise<Response> {
  let session;
  try {
    session = await requireAdmin('editor', credentialsFromRequest(request));
  } catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }

  const limit = consume(
    `upload:${hashClientId(clientIp(request))}`,
    RATE_LIMITS.upload.limit,
    RATE_LIMITS.upload.windowMs,
  );
  if (!limit.allowed) return fail('RATE_LIMITED', 'Too many uploads.', 429);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail('BAD_REQUEST', 'Expected multipart/form-data.', 400);
  }

  const entityType = String(formData.get('entityType') ?? '');
  const entityId = String(formData.get('entityId') ?? '');
  const altFr = String(formData.get('altFr') ?? '').slice(0, 200);
  const altAr = String(formData.get('altAr') ?? '').slice(0, 200);
  const credit = String(formData.get('credit') ?? '').slice(0, 200) || null;
  const sourceUrl = String(formData.get('sourceUrl') ?? '').slice(0, 500) || null;
  const license = String(formData.get('license') ?? '').slice(0, 120) || null;

  if (entityType !== 'property' && entityType !== 'vehicle') {
    return fail('VALIDATION', 'entityType must be property or vehicle.', 422);
  }
  if (!/^[a-f0-9-]{36}$/.test(entityId)) {
    return fail('VALIDATION', 'Invalid entityId.', 422);
  }

  const files = formData.getAll('files').filter((value): value is File => value instanceof File);
  if (files.length === 0) return fail('VALIDATION', 'No file provided.', 422);
  if (files.length > UPLOAD.maxFilesPerRequest) {
    return fail('VALIDATION', `At most ${UPLOAD.maxFilesPerRequest} files per request.`, 422);
  }

  const results: { url: string; id: string }[] = [];
  for (const file of files) {
    try {
      const stored = await storeImage(file);
      const mediaId = addMedia({
        entityType,
        entityId,
        url: stored.url,
        altFr: altFr || 'Photo du bien',
        altAr: altAr || 'صورة العقار',
        credit,
        sourceUrl,
        license,
      });
      results.push({ url: stored.url, id: mediaId });
    } catch (error) {
      if (error instanceof UploadError) {
        return fail(error.code, error.message, error.code === 'TOO_LARGE' ? 413 : 415);
      }
      console.error('[media] upload failed', error);
      return fail('SERVER_ERROR', 'Upload failed.', 500);
    }
  }

  recordAudit(session, 'media.upload', entityType, entityId, { count: results.length });
  return ok(results);
}

/** DELETE /api/admin/media?id=<mediaId> — removes a photo and its file. */
export async function DELETE(request: Request): Promise<Response> {
  let session;
  try {
    session = await requireAdmin('editor', credentialsFromRequest(request));
  } catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('VALIDATION', 'Missing media id.', 422);

  const removed = deleteMedia(id);
  if (!removed) return fail('NOT_FOUND', 'Media not found.', 404);

  recordAudit(session, 'media.delete', 'media', id);
  return ok({ deleted: true });
}
