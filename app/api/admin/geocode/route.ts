import { HttpError, requireSession } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { clientIp, fail, isSameOrigin, ok } from '@/lib/server/api';
import { GeocoderError, searchAddress } from '@/lib/server/geocoder';
import { consume, hashClientId } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  try { await requireSession('editor', credentialsFromRequest(request)); }
  catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }
  const query = new URL(request.url).searchParams.get('q') ?? '';
  const limit = consume(`geocode:${hashClientId(clientIp(request))}`, 30, 60_000);
  if (!limit.allowed) return fail('RATE_LIMITED', 'Too many address searches.', 429);
  try {
    const results = await searchAddress(query);
    return ok({ query: query.trim(), results, verification: 'unverified' });
  } catch (error) {
    if (error instanceof GeocoderError) {
      const response = fail(error.code, error.message, error.status);
      if (error.retryAfterSeconds) response.headers.set('Retry-After', String(error.retryAfterSeconds));
      return response;
    }
    return fail('GEOCODER_UNAVAILABLE', 'The address service could not be reached.', 502);
  }
}
