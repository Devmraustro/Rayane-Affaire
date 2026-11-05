import { setPlaceLocationVerification } from '@/lib/db/admin-places';
import { ListingError } from '@/lib/db/admin-listings';
import { HttpError, requireAdmin } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, ok } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context): Promise<Response> {
  let session;
  try { session = await requireAdmin('editor', credentialsFromRequest(request)); }
  catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }
  let body: unknown;
  try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const verified = (body as { verified?: unknown })?.verified;
  if (typeof verified !== 'boolean') return fail('VALIDATION', 'verified must be a boolean.', 422);
  try {
    const place = setPlaceLocationVerification((await context.params).id, verified, session.user.id);
    recordAudit(session, verified ? 'place.location.verify' : 'place.location.unverify', 'place', place.id, { verified });
    return ok(place);
  } catch (error) {
    if (error instanceof ListingError) return fail(error.code, error.message, error.code === 'NOT_FOUND' ? 404 : 422);
    return fail('SERVER_ERROR', 'Could not change location verification.', 500);
  }
}
