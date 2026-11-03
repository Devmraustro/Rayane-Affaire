import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTempDbEnv, initSchema, type TempDb } from './helpers/temp-db';

/**
 * HTTP-level integration tests.
 *
 * These call the real route handlers (`POST`) with real `Request` objects
 * against a real SQLite database — authentication, CSRF, authorisation, audit
 * logging, validation envelopes and the public inquiry endpoint are exercised
 * end-to-end. No handler is mocked and no database is faked.
 */
let env: TempDb;
let ownerToken = '';
let csrf = '';
let editorToken = '';
let editorCsrf = '';
let managerToken = '';
let managerCsrf = '';

const ORIGIN = 'http://localhost:3000';

function request(path: string, init: RequestInit & { cookie?: string } = {}): Request {
  const headers = new Headers(init.headers);
  // A real Next.js request always carries Host; isSameOrigin compares it with Origin.
  headers.set('host', 'localhost:3000');
  headers.set('origin', ORIGIN);
  headers.set('content-type', 'application/json');
  if (init.cookie) headers.set('cookie', init.cookie);
  return new Request(`${ORIGIN}${path}`, { ...init, headers });
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

/** The cross-origin test needs a *different* Host/Origin pair. */
function crossOriginRequest(path: string, body: unknown): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.set('host', 'localhost:3000');
  headers.set('origin', 'https://evil.example');
  return new Request(`${ORIGIN}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

beforeAll(async () => {
  env = createTempDbEnv();
  await initSchema();

  const { createAdminUser } = await import('@/lib/db/admin-users');
  const { issueSession } = await import('@/lib/server/session');

  // Sessions are issued by the same code the login route uses; the cookie
  // adapter is the only part that needs a real Next.js request context.
  const owner = await createAdminUser({
    email: 'owner@test.dz',
    password: 'Béjaïa-Rayane-2024!x',
    fullName: 'Owner Test',
    role: 'owner',
  });
  const editor = await createAdminUser({
    email: 'editor@test.dz',
    password: 'Béjaïa-Rayane-2024!x',
    fullName: 'Editor Test',
    role: 'editor',
  });
  const manager = await createAdminUser({
    email: 'manager@test.dz',
    password: 'Béjaïa-Rayane-2024!x',
    fullName: 'Manager Test',
    role: 'manager',
  });

  const ownerSession = issueSession(owner.id);
  ownerToken = ownerSession.token;
  csrf = ownerSession.csrfToken;

  const editorSession = issueSession(editor.id);
  editorToken = editorSession.token;
  editorCsrf = editorSession.csrfToken;

  const managerSession = issueSession(manager.id);
  managerToken = managerSession.token;
  managerCsrf = managerSession.csrfToken;
});

/** Cookie header for an admin session. */
function as(token: string): string {
  return `ra_session=${token}`;
}

afterAll(() => env.cleanup());

const validProperty = {
  titleFr: 'Appartement F3 Ihaddaden',
  titleAr: 'شقة F3 إحدادن',
  descriptionFr: 'Trois pièces avec balcon.',
  descriptionAr: 'ثلاث غرف مع شرفة.',
  category: 'apartment',
  transaction: 'rent_annual',
  price: 45000,
  priceUnit: 'month',
  communeSlug: 'bejaia',
  surface: 82,
  bedrooms: 3,
  bathrooms: 1,
  furnishing: 'unfurnished',
  coordinatePrecision: 'pending',
  status: 'draft',
};

describe('authentication', () => {
  it('rejects a wrong password with a generic 401', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const response = await POST(
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'owner@test.dz', password: 'nope' }),
      }),
    );
    expect(response.status).toBe(401);
    const body = await json(response);
    expect((body.error as Record<string, unknown>).code).toBe('INVALID_CREDENTIALS');
  });

  it('gives the same generic answer for an unknown account (no user enumeration)', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const response = await POST(
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'ghost@test.dz', password: 'whatever' }),
      }),
    );
    expect(response.status).toBe(401);
    const body = await json(response);
    expect((body.error as Record<string, unknown>).code).toBe('INVALID_CREDENTIALS');
  });

  it('returns the signed-in identity without leaking the password hash', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const response = await POST(
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'owner@test.dz', password: 'Béjaïa-Rayane-2024!x' }),
      }),
    );
    expect(response.status).toBe(200);
    const raw = await response.text();
    expect(raw).not.toContain('scrypt$');
    const body = JSON.parse(raw) as { data: { user: Record<string, unknown> } };
    expect(body.data.user.email).toBe('owner@test.dz');
    expect(body.data.user).not.toHaveProperty('passwordHash');
  });

  it('sets HttpOnly on the session cookie and leaves the CSRF cookie readable', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const response = await POST(
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'owner@test.dz', password: 'Béjaïa-Rayane-2024!x' }),
      }),
    );
    const cookies = response.headers.getSetCookie();
    const session = cookies.find((c) => c.startsWith('ra_session=')) ?? '';
    const csrfCookie = cookies.find((c) => c.startsWith('ra_csrf=')) ?? '';

    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(session).toMatch(/Path=\//i);
    expect(session).toMatch(/Expires=/i);
    // The CSRF cookie must be readable by the admin UI, so it is NOT HttpOnly.
    expect(csrfCookie).not.toMatch(/HttpOnly/i);
    expect(csrfCookie.length).toBeGreaterThan('ra_csrf=;'.length);
  });

  it('revokes the session on logout and clears both cookies', async () => {
    const { issueSession, resolveSessionToken } = await import('@/lib/server/session');
    const { findByEmailWithHash } = await import('@/lib/db/admin-users');
    const owner = findByEmailWithHash('owner@test.dz')!;
    const session = issueSession(owner.user.id);
    expect(resolveSessionToken(session.token)).not.toBeNull();

    const { POST } = await import('@/app/api/auth/logout/route');
    const response = await POST(
      request('/api/auth/logout', {
        method: 'POST',
        cookie: as(session.token),
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(200);
    expect(resolveSessionToken(session.token)).toBeNull();

    const cookies = response.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith('ra_session=;'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('ra_csrf=;'))).toBe(true);
  });

  it('rejects a cross-origin login attempt', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const response = await POST(
      crossOriginRequest('/api/auth/login', {
        email: 'owner@test.dz',
        password: 'Béjaïa-Rayane-2024!x',
      }),
    );
    expect(response.status).toBe(403);
    const body = await json(response);
    expect((body.error as Record<string, unknown>).code).toBe('FORBIDDEN');
  });

  it('validates the payload shape', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const response = await POST(
      request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'bad' }) }),
    );
    expect(response.status).toBe(422);
  });
});

describe('CSRF protection on writes', () => {
  it('rejects a create without the CSRF header', async () => {
    const { POST } = await import('@/app/api/admin/properties/route');
    const response = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        cookie: as(ownerToken), // no x-ra-csrf header
        body: JSON.stringify(validProperty),
      }),
    );
    expect(response.status).toBe(403);
    const body = await json(response);
    expect((body.error as Record<string, unknown>).code).toBe('CSRF');
  });

  it('rejects a create with a wrong CSRF token', async () => {
    const { POST } = await import('@/app/api/admin/properties/route');
    const response = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        cookie: as(ownerToken),
        headers: { 'x-ra-csrf': 'definitely-not-the-token' },
        body: JSON.stringify(validProperty),
      }),
    );
    expect(response.status).toBe(403);
  });
});

describe('authorisation', () => {
  it('rejects an unauthenticated request', async () => {
    const { POST } = await import('@/app/api/admin/properties/route');
    const response = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        headers: { 'x-ra-csrf': csrf },
        body: JSON.stringify(validProperty),
      }),
    );
    expect(response.status).toBe(401);
  });

  it('forbids an editor from deleting a listing', async () => {
    const { DELETE } = await import('@/app/api/admin/properties/[id]/route');
    const response = await DELETE(
      request('/api/admin/properties/00000000-0000-4000-8000-000000000000', {
        method: 'DELETE',
        cookie: as(editorToken),
        headers: { 'x-ra-csrf': editorCsrf },
      }),
      { params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000000' }) },
    );
    expect(response.status).toBe(403);
  });
});

describe('role matrix', () => {
  it('lets an editor create and publish listings (editor role is a writer)', async () => {
    const { POST } = await import('@/app/api/admin/properties/route');
    const response = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        cookie: as(editorToken),
        headers: { 'x-ra-csrf': editorCsrf },
        body: JSON.stringify({ ...validProperty, titleFr: 'Bien créé par un éditeur' }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await json(response);
    const id = (body.data as Record<string, unknown>).id as string;

    const { DELETE } = await import('@/app/api/admin/properties/[id]/route');
    const cleanup = await DELETE(
      request(`/api/admin/properties/${id}`, {
        method: 'DELETE',
        cookie: as(ownerToken),
        headers: { 'x-ra-csrf': csrf },
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(cleanup.status).toBe(200);
  });

  it('lets a manager delete a listing', async () => {
    const { POST } = await import('@/app/api/admin/properties/route');
    const created = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        cookie: as(managerToken),
        headers: { 'x-ra-csrf': managerCsrf },
        body: JSON.stringify({ ...validProperty, titleFr: 'Bien supprimé par un manager' }),
      }),
    );
    const id = ((await json(created)).data as Record<string, unknown>).id as string;

    const { DELETE } = await import('@/app/api/admin/properties/[id]/route');
    const response = await DELETE(
      request(`/api/admin/properties/${id}`, {
        method: 'DELETE',
        cookie: as(managerToken),
        headers: { 'x-ra-csrf': managerCsrf },
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
  });

  it('rejects a session belonging to a deactivated account', async () => {
    const { getDb } = await import('@/db/client');
    const { POST } = await import('@/app/api/admin/properties/route');
    getDb().prepare("UPDATE admin_users SET active = 0 WHERE email = 'editor@test.dz'").run();
    const response = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        cookie: as(editorToken),
        headers: { 'x-ra-csrf': editorCsrf },
        body: JSON.stringify(validProperty),
      }),
    );
    getDb().prepare("UPDATE admin_users SET active = 1 WHERE email = 'editor@test.dz'").run();
    expect(response.status).toBe(401);
  });

  it('rejects an expired session', async () => {
    const { getDb } = await import('@/db/client');
    const { issueSession } = await import('@/lib/server/session');
    const { findByEmailWithHash } = await import('@/lib/db/admin-users');
    const owner = findByEmailWithHash('owner@test.dz')!;
    const expired = issueSession(owner.user.id);
    getDb()
      .prepare('UPDATE admin_sessions SET expires_at = ? WHERE csrf_token = ?')
      .run('2000-01-01T00:00:00.000Z', expired.csrfToken);

    const { POST } = await import('@/app/api/admin/properties/route');
    const response = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        cookie: as(expired.token),
        headers: { 'x-ra-csrf': expired.csrfToken },
        body: JSON.stringify(validProperty),
      }),
    );
    expect(response.status).toBe(401);
  });

  it('rejects a revoked (logged out) session', async () => {
    const { issueSession, revokeSessionToken } = await import('@/lib/server/session');
    const { findByEmailWithHash } = await import('@/lib/db/admin-users');
    const owner = findByEmailWithHash('owner@test.dz')!;
    const session = issueSession(owner.user.id);
    expect(revokeSessionToken(session.token)).toBe(true);

    const { POST } = await import('@/app/api/admin/properties/route');
    const response = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        cookie: as(session.token),
        headers: { 'x-ra-csrf': session.csrfToken },
        body: JSON.stringify(validProperty),
      }),
    );
    expect(response.status).toBe(401);
  });

  it('rejects a forged session token', async () => {
    const { POST } = await import('@/app/api/admin/properties/route');
    const response = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        cookie: as('forged-token-value-that-was-never-issued'),
        headers: { 'x-ra-csrf': csrf },
        body: JSON.stringify(validProperty),
      }),
    );
    expect(response.status).toBe(401);
  });
});

describe('property CRUD over HTTP', () => {
  let createdId = '';

  it('creates a draft listing', async () => {
    const { POST } = await import('@/app/api/admin/properties/route');
    const response = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        cookie: as(ownerToken),
        headers: { 'x-ra-csrf': csrf },
        body: JSON.stringify(validProperty),
      }),
    );
    expect(response.status).toBe(200);
    const body = await json(response);
    const data = body.data as Record<string, unknown>;
    createdId = data.id as string;
    expect(data.reference).toMatch(/^RA-P-\d{4}$/);
    expect(data.status).toBe('draft');
  });

  it('returns 422 with field-level i18n codes for invalid input', async () => {
    const { POST } = await import('@/app/api/admin/properties/route');
    const response = await POST(
      request('/api/admin/properties', {
        method: 'POST',
        cookie: as(ownerToken),
        headers: { 'x-ra-csrf': csrf },
        body: JSON.stringify({ ...validProperty, price: -5, titleFr: '' }),
      }),
    );
    expect(response.status).toBe(422);
    const body = await json(response);
    const error = body.error as Record<string, unknown>;
    expect(error.code).toBe('VALIDATION');
    const fields = error.fields as Record<string, string>;
    expect(fields.titleFr).toBeTruthy();
    expect(fields.price).toBeTruthy();
  });

  it('refuses to publish without a photograph (422 MEDIA_REQUIRED)', async () => {
    const { PATCH } = await import('@/app/api/admin/properties/[id]/route');
    const response = await PATCH(
      request(`/api/admin/properties/${createdId}`, {
        method: 'PATCH',
        cookie: as(ownerToken),
        headers: { 'x-ra-csrf': csrf },
        body: JSON.stringify({ statusOnly: 'published' }),
      }),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(response.status).toBe(422);
    const body = await json(response);
    expect((body.error as Record<string, unknown>).code).toBe('MEDIA_REQUIRED');
  });

  it('returns 404 for an unknown identifier', async () => {
    const { PATCH } = await import('@/app/api/admin/properties/[id]/route');
    const response = await PATCH(
      request('/api/admin/properties/11111111-1111-4111-8111-111111111111', {
        method: 'PATCH',
        cookie: as(ownerToken),
        headers: { 'x-ra-csrf': csrf },
        body: JSON.stringify({ statusOnly: 'archived' }),
      }),
      { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) },
    );
    expect(response.status).toBe(404);
  });

  it('writes an audit row for every mutation', async () => {
    const { listAudit } = await import('@/lib/server/audit');
    const entries = listAudit(50);
    expect(entries.some((entry) => entry.action.includes('property'))).toBe(true);
    expect(entries.every((entry) => entry.created_at)).toBe(true);
  });

  it('deletes the listing as the owner and audits the deletion', async () => {
    const { DELETE } = await import('@/app/api/admin/properties/[id]/route');
    const response = await DELETE(
      request(`/api/admin/properties/${createdId}`, {
        method: 'DELETE',
        cookie: as(ownerToken),
        headers: { 'x-ra-csrf': csrf },
      }),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(response.status).toBe(200);
    const { listAudit } = await import('@/lib/server/audit');
    expect(listAudit(20).some((entry) => entry.action.includes('delete'))).toBe(true);
  });
});

describe('public inquiry endpoint', () => {
  it('accepts a valid inquiry and stores it', async () => {
    const { POST } = await import('@/app/api/inquiries/route');
    const response = await POST(
      request('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Amine Boudiaf',
          phone: '0550 12 34 56',
          email: 'amine@example.dz',
          message: 'Bonjour, je cherche un F3 à Béjaïa pour 45 000 DA par mois.',
          consent: true,
          type: 'property',
          locale: 'fr',
        }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await json(response);
    expect((body.data as Record<string, unknown>).received).toBe(true);

    const { listInquiries } = await import('@/lib/db/inquiries');
    const { items } = listInquiries({ pageSize: 10 });
    expect(items.some((item) => item.phone === '0550123456')).toBe(true);
  });

  it('rejects an invalid inquiry with translated field codes', async () => {
    const { POST } = await import('@/app/api/inquiries/route');
    const response = await POST(
      request('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify({ fullName: 'A', phone: 'x', message: 'short', consent: false }),
      }),
    );
    expect(response.status).toBe(422);
    const body = await json(response);
    const fields = (body.error as Record<string, unknown>).fields as Record<string, string>;
    expect(fields.fullName).toBe('form.nameTooShort');
    expect(fields.phone).toBe('form.phoneInvalid');
    expect(fields.consent).toBe('form.consentRequired');
  });

  it('blocks a filled honeypot field', async () => {
    const { POST } = await import('@/app/api/inquiries/route');
    const response = await POST(
      request('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Bot Bot',
          phone: '0550123456',
          message: 'Achetez des followers sur mon site pas cher, livraison rapide.',
          consent: true,
          website: 'https://spam.example',
        }),
      }),
    );
    expect(response.status).toBe(422);
  });

  it('rate-limits repeated submissions from the same client', async () => {
    const { POST } = await import('@/app/api/inquiries/route');
    const payload = JSON.stringify({
      fullName: 'Amine Boudiaf',
      phone: '0550123456',
      message: 'Bonjour, je cherche un F3 à Béjaïa pour 45 000 DA par mois.',
      consent: true,
    });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await POST(
        new Request(`${ORIGIN}/api/inquiries`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
          body: payload,
        }),
      );
      statuses.push(response.status);
    }
    expect(statuses).toContain(429);
  });
});
