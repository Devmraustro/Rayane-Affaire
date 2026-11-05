import '@/lib/server/guard';

export interface GeocoderResult {
  id: string;
  label: string;
  lat: number;
  lng: number;
  category: string;
  type: string;
  boundingBox: [number, number, number, number] | null;
  /** Upstream search can only propose an approximate, unverified candidate. */
  coordinatePrecision: 'approximate';
  verified: false;
}

export class GeocoderError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfterSeconds?: number) {
    super(message);
  }
}

function finiteCoordinate(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

/** Calls the configured Nominatim-compatible service and fails closed on an
 * invalid response. No result is persisted by this integration. */
export async function searchAddress(query: string, fetcher: typeof fetch = fetch): Promise<GeocoderResult[]> {
  const cleaned = query.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 2 || cleaned.length > 200) {
    throw new GeocoderError(422, 'VALIDATION', 'Address query must contain between 2 and 200 characters.');
  }
  const base = process.env.GEOCODER_BASE_URL ?? 'https://nominatim.openstreetmap.org/search';
  const url = new URL(base);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', cleaned);
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', process.env.GEOCODER_COUNTRY_CODES ?? 'dz');
  const email = process.env.GEOCODER_EMAIL?.trim();
  if (email) url.searchParams.set('email', email);

  let response: Response;
  try {
    response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'fr,ar;q=0.8',
        'User-Agent': process.env.GEOCODER_USER_AGENT ?? 'RayaneAffairePreview/1.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    if (error instanceof GeocoderError) throw error;
    throw new GeocoderError(502, 'GEOCODER_UNAVAILABLE', 'The address service could not be reached.');
  }
  if (response.status === 429) {
    const retry = Number(response.headers.get('retry-after'));
    throw new GeocoderError(429, 'GEOCODER_RATE_LIMITED', 'The address service rate limit was reached.', Number.isFinite(retry) ? retry : 60);
  }
  if (!response.ok) throw new GeocoderError(502, 'GEOCODER_UNAVAILABLE', `Address service returned HTTP ${response.status}.`);
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new GeocoderError(502, 'GEOCODER_INVALID_RESPONSE', 'Address service returned invalid JSON.'); }
  if (!Array.isArray(payload)) throw new GeocoderError(502, 'GEOCODER_INVALID_RESPONSE', 'Address service returned an unexpected payload.');

  const results: GeocoderResult[] = [];
  for (const value of payload.slice(0, 5)) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const lat = finiteCoordinate(row.lat, -90, 90);
    const lng = finiteCoordinate(row.lon ?? row.lng, -180, 180);
    if (lat === null || lng === null || typeof row.display_name !== 'string') continue;
    const box = Array.isArray(row.boundingbox) ? row.boundingbox.map(Number) : [];
    const validBox = box.length === 4 && box.every(Number.isFinite)
      ? [box[0]!, box[1]!, box[2]!, box[3]!] as [number, number, number, number]
      : null;
    results.push({
      id: `${String(row.osm_type ?? 'node')}:${String(row.osm_id ?? `${lat},${lng}`)}`,
      label: row.display_name.slice(0, 500), lat, lng,
      category: String(row.category ?? row.class ?? 'place').slice(0, 80),
      type: String(row.type ?? 'unknown').slice(0, 80), boundingBox: validBox,
      coordinatePrecision: 'approximate', verified: false,
    });
  }
  return results;
}
