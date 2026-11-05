import { HttpError, requireAdmin } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, isSameOrigin, ok } from '@/lib/server/api';
import { cleanupOrphanedMedia } from '@/lib/server/media-cleanup';
import { recordAudit } from '@/lib/server/audit';
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  let session; try { session = await requireAdmin('manager', credentialsFromRequest(request)); } catch (error) { if (error instanceof HttpError) return fail(error.code, error.message, error.status); return fail('UNAUTHORIZED', 'Authentication required.', 401); }
  const result = cleanupOrphanedMedia(); recordAudit(session, 'media.cleanup', 'media', null, result); return ok(result);
}
