import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { GeocoderError, searchAddress } from '@/lib/server/geocoder';
import { createTempDbEnv, initSchema, type TempDb } from './helpers/temp-db';
const response = (body: unknown, status = 200, headers: Record<string,string> = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const LIVE_BEJAIA_STREET_FIXTURE = [
  {
    place_id: 52520590,
    osm_type: 'way',
    osm_id: 150431810,
    lat: '36.7515749',
    lon: '5.0676336',
    category: 'highway',
    type: 'secondary',
    name: 'Rue de la Liberté',
    display_name: 'Rue de la Liberté, Résidence universitaire 1000 lits, Cité Frères Mebroukine, Bejaia, Bejaia District, Bejaia, 06000, Algeria',
    boundingbox: ['36.7510995', '36.7523498', '5.0645180', '5.0706944'],
  },
  {
    place_id: 53161580,
    osm_type: 'way',
    osm_id: 567855248,
    lat: '36.7516846',
    lon: '5.0676087',
    category: 'highway',
    type: 'secondary',
    name: 'Rue de la Liberté شارع الحرية',
    display_name: 'Rue de la Liberté شارع الحرية, Résidence universitaire 1000 lits, Cité Frères Mebroukine, Bejaia, Bejaia District, Bejaia, 06000, Algeria',
    boundingbox: ['36.7512693', '36.7524363', '5.0644933', '5.0706736'],
  },
];

const LIVE_WILAYA_COMMUNE_FIXTURES = {
  tichy: [{
    place_id: 53258226,
    osm_type: 'relation',
    osm_id: 4112952,
    lat: '36.6689510',
    lon: '5.1574875',
    category: 'boundary',
    type: 'administrative',
    display_name: 'Tichy, Tichy District, Bejaia, 06023, Algeria',
    boundingbox: ['36.5651034', '36.6760819', '5.1164590', '5.2142551'],
  }],
  setif: [{
    place_id: 52786048,
    osm_type: 'relation',
    osm_id: 1617602,
    lat: '36.1893494',
    lon: '5.4046876',
    category: 'boundary',
    type: 'administrative',
    display_name: 'Setif, Setif District, Setif, 19000, Algeria',
    boundingbox: ['36.1335573', '36.2486900', '5.3370560', '5.5062850'],
  }],
  bejaiaArabic: [{
    place_id: 52969430,
    osm_type: 'relation',
    osm_id: 2094122,
    lat: '36.7511783',
    lon: '5.0643687',
    category: 'boundary',
    type: 'administrative',
    display_name: 'Bejaia, Bejaia District, Bejaia, 06000, Algeria',
    boundingbox: ['36.7056237', '36.8336530', '4.9086660', '5.1074723'],
  }],
};

describe('Nominatim integration boundary', () => {
  it('normalises successful results as approximate and unverified', async () => { const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response([{ osm_type: 'way', osm_id: 42, display_name: 'Rue test, Béjaïa', lat: '36.75', lon: '5.06', category: 'highway', type: 'residential', boundingbox: ['36.7','36.8','5.0','5.1'] }])); const results = await searchAddress('Béjaïa', fetcher as typeof fetch); expect(results).toHaveLength(1); expect(results[0]).toMatchObject({ lat: 36.75, lng: 5.06, coordinatePrecision: 'approximate', verified: false }); expect(String(fetcher.mock.calls[0]?.[0])).toContain('countrycodes=dz'); });
  it('parses real Nominatim v2 payloads for Algerian streets, communes, wilayas and Arabic queries as approximate/unverified', async () => {
    const street = await searchAddress('Rue de la Liberté, Béjaïa', (async () => response(LIVE_BEJAIA_STREET_FIXTURE)) as unknown as typeof fetch);
    expect(street).toHaveLength(2);
    expect(street[0]).toEqual({
      id: 'way:150431810',
      label: 'Rue de la Liberté, Résidence universitaire 1000 lits, Cité Frères Mebroukine, Bejaia, Bejaia District, Bejaia, 06000, Algeria',
      lat: 36.7515749,
      lng: 5.0676336,
      category: 'highway',
      type: 'secondary',
      boundingBox: [36.7510995, 36.7523498, 5.064518, 5.0706944],
      coordinatePrecision: 'approximate',
      verified: false,
    });
    const tichy = await searchAddress('Tichy', (async () => response(LIVE_WILAYA_COMMUNE_FIXTURES.tichy)) as unknown as typeof fetch);
    expect(tichy[0]).toMatchObject({ id: 'relation:4112952', lat: 36.668951, lng: 5.1574875, coordinatePrecision: 'approximate', verified: false });
    const setif = await searchAddress('Sétif', (async () => response(LIVE_WILAYA_COMMUNE_FIXTURES.setif)) as unknown as typeof fetch);
    expect(setif[0]).toMatchObject({ id: 'relation:1617602', lat: 36.1893494, lng: 5.4046876, coordinatePrecision: 'approximate', verified: false });
    const arabic = await searchAddress('بجاية', (async () => response(LIVE_WILAYA_COMMUNE_FIXTURES.bejaiaArabic)) as unknown as typeof fetch);
    expect(arabic[0]).toMatchObject({ id: 'relation:2094122', lat: 36.7511783, lng: 5.0643687, coordinatePrecision: 'approximate', verified: false });
  });
  it('returns an empty list for an upstream empty result', async () => { expect(await searchAddress('adresse inconnue', vi.fn(async () => response([])) as unknown as typeof fetch)).toEqual([]); });
  it('rejects invalid queries without calling upstream', async () => { const fetcher = vi.fn(); await expect(searchAddress('x', fetcher as unknown as typeof fetch)).rejects.toMatchObject({ status: 422, code: 'VALIDATION' }); expect(fetcher).not.toHaveBeenCalled(); });
  it('maps upstream failures and rate limits without inventing coordinates', async () => { await expect(searchAddress('Béjaïa', vi.fn(async () => response('no', 503)) as unknown as typeof fetch)).rejects.toMatchObject({ status: 502, code: 'GEOCODER_UNAVAILABLE' }); await expect(searchAddress('Béjaïa', vi.fn(async () => response([], 429, { 'retry-after': '17' })) as unknown as typeof fetch)).rejects.toMatchObject({ status: 429, code: 'GEOCODER_RATE_LIMITED', retryAfterSeconds: 17 }); });
  it('fails closed on invalid JSON and skips invalid coordinate rows', async () => { await expect(searchAddress('Béjaïa', vi.fn(async () => response('{bad')) as unknown as typeof fetch)).rejects.toBeInstanceOf(GeocoderError); expect(await searchAddress('Béjaïa', vi.fn(async () => response([{ display_name: 'bad', lat: '999', lon: '5' }])) as unknown as typeof fetch)).toEqual([]); });
  it('maps network and timeout failures to 502', async () => { await expect(searchAddress('Béjaïa', vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch)).rejects.toMatchObject({ status: 502, code: 'GEOCODER_UNAVAILABLE' }); });
});

describe('authenticated /api/admin/geocode route', () => {
  let env: TempDb;
  let editorToken = '';
  let forcedToken = '';
  beforeAll(async () => {
    env = createTempDbEnv();
    await initSchema();
    const { createAdminUser } = await import('@/lib/db/admin-users');
    const { issueSession } = await import('@/lib/server/session');
    const editor = await createAdminUser({ email: 'geo-editor@test.dz', password: 'Geo-Editor-Password-2026', fullName: 'Geo Editor', role: 'editor' });
    const forced = await createAdminUser({ email: 'geo-forced@test.dz', password: 'Geo-Forced-Password-2026', fullName: 'Geo Forced', role: 'editor', mustChangePassword: true });
    editorToken = issueSession(editor.id).token;
    forcedToken = issueSession(forced.id).token;
  });
  afterAll(() => {
    vi.restoreAllMocks();
    env.cleanup();
  });

  it('enforces authentication, password-rotation gate, same-origin check and non-persistence', async () => {
    const { GET } = await import('@/app/api/admin/geocode/route');
    const { getDb } = await import('@/db/client');

    const unauth = await GET(new Request('http://localhost:3000/api/admin/geocode?q=Bejaia', { headers: { host: 'localhost:3000' } }));
    expect(unauth.status).toBe(401);

    const crossOrigin = await GET(new Request('http://localhost:3000/api/admin/geocode?q=Bejaia', {
      headers: { host: 'localhost:3000', origin: 'https://evil.example', cookie: `ra_session=${editorToken}` },
    }));
    expect(crossOrigin.status).toBe(403);

    const forced = await GET(new Request('http://localhost:3000/api/admin/geocode?q=Bejaia', {
      headers: { host: 'localhost:3000', cookie: `ra_session=${forcedToken}` },
    }));
    expect(forced.status).toBe(403);
    expect((await forced.json()).error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    const invalid = await GET(new Request('http://localhost:3000/api/admin/geocode?q=a', {
      headers: { host: 'localhost:3000', cookie: `ra_session=${editorToken}`, 'x-forwarded-for': '198.51.100.10' },
    }));
    expect(invalid.status).toBe(422);

    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response(LIVE_BEJAIA_STREET_FIXTURE));
    const okRes = await GET(new Request('http://localhost:3000/api/admin/geocode?q=Rue+de+la+Libert%C3%A9', {
      headers: { host: 'localhost:3000', cookie: `ra_session=${editorToken}`, 'x-forwarded-for': '198.51.100.11' },
    }));
    expect(okRes.status).toBe(200);
    const body = await okRes.json() as { ok: boolean; data: { verification: string; results: Array<{ coordinatePrecision: string; verified: boolean }> } };
    expect(body.data.verification).toBe('unverified');
    expect(body.data.results[0]).toMatchObject({ coordinatePrecision: 'approximate', verified: false });
    expect((getDb().prepare('SELECT COUNT(*) AS n FROM places').get() as { n: number }).n).toBe(0);
    expect((getDb().prepare('SELECT COUNT(*) AS n FROM properties').get() as { n: number }).n).toBe(0);
    spy.mockRestore();
  });
});
