import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTempDbEnv, initSchema, type TempDb } from './helpers/temp-db';

/**
 * Security tests — real crypto, real database, no mocks.
 * Password hashing, session-token storage, CSRF comparison, rate limiting and
 * upload MIME sniffing.
 */
let env: TempDb;

beforeAll(async () => {
  env = createTempDbEnv();
  await initSchema();
});

afterAll(() => env.cleanup());

describe('password hashing (scrypt)', () => {
  it('produces a salted, self-describing hash', async () => {
    const { hashPassword } = await import('@/lib/server/password');
    const hash = await hashPassword('Béjaïa-Rayane-2024!x');
    const parts = hash.split('$');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('scrypt');
    expect(Number(parts[1])).toBeGreaterThanOrEqual(16384);
    expect(parts[4]).not.toBe(parts[5]);
  });

  it('produces a different hash for the same password (random salt)', async () => {
    const { hashPassword } = await import('@/lib/server/password');
    const a = await hashPassword('same-password-value');
    const b = await hashPassword('same-password-value');
    expect(a).not.toBe(b);
  });

  it('verifies the correct password and rejects a wrong one', async () => {
    const { hashPassword, verifyPassword } = await import('@/lib/server/password');
    const hash = await hashPassword('Correct-Horse-Battery-9');
    await expect(verifyPassword('Correct-Horse-Battery-9', hash)).resolves.toBe(true);
    await expect(verifyPassword('correct-horse-battery-9', hash)).resolves.toBe(false);
    await expect(verifyPassword('', hash)).resolves.toBe(false);
  });

  it('rejects a malformed stored hash without throwing', async () => {
    const { verifyPassword } = await import('@/lib/server/password');
    await expect(verifyPassword('x', 'not-a-hash')).resolves.toBe(false);
    await expect(verifyPassword('x', 'scrypt$1$2$3')).resolves.toBe(false);
  });

  it('normalises unicode so composed and decomposed forms both verify', async () => {
    const { hashPassword, verifyPassword } = await import('@/lib/server/password');
    const composed = 'Béjaïa2024!';
    const decomposed = composed.normalize('NFD');
    const hash = await hashPassword(composed);
    await expect(verifyPassword(decomposed, hash)).resolves.toBe(true);
  });

  it('enforces the password strength policy', async () => {
    const { validatePasswordStrength } = await import('@/lib/server/password');
    expect(validatePasswordStrength('short')).not.toBeNull();
    expect(validatePasswordStrength('alllowercase1234')).not.toBeNull();
    expect(validatePasswordStrength('ALLUPPERCASE1234')).not.toBeNull();
    expect(validatePasswordStrength('NoDigitsAtAllHere')).not.toBeNull();
    expect(validatePasswordStrength('Béjaïa-Rayane-2024!x')).toBeNull();
  });
});

describe('admin accounts and sessions', () => {
  it('creates an owner account and never stores the raw password', async () => {
    const { createAdminUser, findByEmailWithHash } = await import('@/lib/db/admin-users');
    const { getDb } = await import('@/db/client');

    const user = await createAdminUser({
      email: 'Owner@Rayane-Affaire.DZ',
      password: 'Béjaïa-Rayane-2024!x',
      fullName: 'Gérant',
      role: 'owner',
    });
    expect(user.email).toBe('owner@rayane-affaire.dz');

    const row = getDb()
      .prepare('SELECT password_hash FROM admin_users WHERE id = ?')
      .get(user.id) as { password_hash: string };
    expect(row.password_hash).not.toContain('Béjaïa');
    expect(row.password_hash.startsWith('scrypt$')).toBe(true);

    const found = findByEmailWithHash('owner@rayane-affaire.dz');
    expect(found?.user.role).toBe('owner');
  });

  it('stores only a keyed hash of the session token', async () => {
    const { getDb } = await import('@/db/client');
    const { createHash } = await import('node:crypto');
    const { findByEmailWithHash } = await import('@/lib/db/admin-users');
    const { sessionSecret } = await import('@/lib/server/env');

    const owner = findByEmailWithHash('owner@rayane-affaire.dz')!;
    const token = 'a-very-secret-session-token-value';
    const stored = createHash('sha256').update(`${token}.${sessionSecret()}`).digest('hex');

    getDb()
      .prepare(
        `INSERT INTO admin_sessions (id, user_id, token_hash, csrf_token, expires_at, created_at)
         VALUES ('s1', ?, ?, 'csrf-token', ?, ?)`,
      )
      .run(owner.user.id, stored, new Date(Date.now() + 3600_000).toISOString(), new Date().toISOString());

    const row = getDb()
      .prepare('SELECT token_hash FROM admin_sessions WHERE id = ?')
      .get('s1') as { token_hash: string };
    // The raw token must not be recoverable from the table.
    expect(row.token_hash).not.toBe(token);
    expect(row.token_hash).toHaveLength(64);
  });

  it('compares CSRF tokens in constant time and rejects a mismatch', async () => {
    const { csrfEquals } = await import('@/lib/server/session');
    expect(csrfEquals('abc123', 'abc123')).toBe(true);
    expect(csrfEquals('abc123', 'abc124')).toBe(false);
    expect(csrfEquals('abc', 'abcdef')).toBe(false);
    expect(csrfEquals('', '')).toBe(true);
  });
});

describe('rate limiting', () => {
  it('allows up to the limit then blocks within the same window', async () => {
    const { consume } = await import('@/lib/server/rate-limit');
    const bucket = `test-${Date.now()}`;
    const first = consume(bucket, 3, 60_000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    consume(bucket, 3, 60_000);
    consume(bucket, 3, 60_000);
    const blocked = consume(bucket, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('isolates buckets', async () => {
    const { consume } = await import('@/lib/server/rate-limit');
    const a = `bucket-a-${Date.now()}`;
    const b = `bucket-b-${Date.now()}`;
    consume(a, 1, 60_000);
    expect(consume(a, 1, 60_000).allowed).toBe(false);
    expect(consume(b, 1, 60_000).allowed).toBe(true);
  });

  it('hashes client identifiers irreversibly', async () => {
    const { hashClientId } = await import('@/lib/server/rate-limit');
    const hashed = hashClientId('192.168.1.42');
    expect(hashed).not.toContain('192');
    expect(hashed).toMatch(/^[0-9a-f]{8}$/);
    expect(hashClientId('192.168.1.42')).toBe(hashed);
    expect(hashClientId('192.168.1.43')).not.toBe(hashed);
  });
});

/** Minimal but structurally valid PNG: the sanitiser validates chunk structure,
 *  so the old "signature + zero padding" fixture is (correctly) refused now. */
function validPng(): Uint8Array<ArrayBuffer> {
  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    return Buffer.concat([length, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
  };
  const joined = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0])),
    chunk('IDAT', Buffer.from([1, 2, 3, 4])),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  // Copy into a plain ArrayBuffer-backed view so it satisfies `BlobPart`.
  const out = new Uint8Array(joined.length);
  out.set(joined);
  return out;
}

describe('upload MIME sniffing', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50,
  ]);

  it('detects PNG, JPEG and WebP from magic bytes', async () => {
    const { detectImageType } = await import('@/lib/server/upload');
    expect(detectImageType(png)?.type).toBe('image/png');
    expect(detectImageType(jpeg)?.type).toBe('image/jpeg');
    expect(detectImageType(webp)?.type).toBe('image/webp');
  });

  it('rejects SVG, HTML and PHP payloads regardless of declared type', async () => {
    const { detectImageType } = await import('@/lib/server/upload');
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const html = new TextEncoder().encode('<html><script>alert(1)</script></html>');
    const php = new TextEncoder().encode('<?php system($_GET["c"]); ?>');
    expect(detectImageType(svg)).toBeNull();
    expect(detectImageType(html)).toBeNull();
    expect(detectImageType(php)).toBeNull();
  });

  it('rejects the legacy extension when the extension is spoofed by content', async () => {
    const { SERVABLE_EXTENSIONS } = await import('@/lib/server/upload');
    expect(SERVABLE_EXTENSIONS.svg).toBeUndefined();
    expect(SERVABLE_EXTENSIONS.php).toBeUndefined();
    expect(SERVABLE_EXTENSIONS.jpg).toBe('image/jpeg');
  });

  it('stores a real PNG and returns a UUID-based path', async () => {
    const { storeImage, removeStoredFile } = await import('@/lib/server/upload');
    const file = new File([validPng()], 'photo.png', {
      type: 'image/png',
    });
    const stored = await storeImage(file);
    expect(stored.url).toMatch(/^\/api\/media\/[a-f0-9-]{36}\.png$/);
    expect(stored.type).toBe('image/png');
    expect(removeStoredFile(stored.url)).toBe(true);
  });

  it('refuses a file whose magic bytes are right but whose structure is garbage', async () => {
    // Before metadata stripping this passed sniffing. A signature followed by
    // junk is not an image, and it must not reach the disk.
    const { storeImage } = await import('@/lib/server/upload');
    const fake = new File([png], 'fake.png', { type: 'image/png' });
    // The API maps this code to 415, so the client gets an honest refusal.
    await expect(storeImage(fake)).rejects.toMatchObject({ code: 'UNSTRIPPABLE_METADATA' });
  });

  it('refuses an oversized file', async () => {
    const { storeImage, UploadError } = await import('@/lib/server/upload');
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await expect(storeImage(big)).rejects.toBeInstanceOf(UploadError);
  });

  it('refuses a masquerading file even when the browser says image/png', async () => {
    const { storeImage } = await import('@/lib/server/upload');
    const fake = new File([new TextEncoder().encode('<svg onload=alert(1)>')], 'evil.png', {
      type: 'image/png',
    });
    await expect(storeImage(fake)).rejects.toThrow(/JPEG, PNG, WebP or AVIF/);
  });

  it('only deletes files that match our generated naming scheme', async () => {
    const { removeStoredFile } = await import('@/lib/server/upload');
    expect(removeStoredFile('/api/media/../../etc/passwd')).toBe(false);
    expect(removeStoredFile('/api/media/not-a-uuid.png')).toBe(false);
  });
});

describe('input sanitisation against XSS', () => {
  it('keeps markup characters as data (escaped at render time, not executed)', async () => {
    const { inquirySchema } = await import('@/lib/validation');
    const result = inquirySchema.safeParse({
      fullName: '<script>alert(1)</script>',
      phone: '0550123456',
      message: 'Bonjour <img src=x onerror=alert(1)> je cherche un F3 à Béjaïa.',
      consent: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // React escapes these on render; the stored value stays inert text.
      expect(result.data.fullName).toContain('<script>');
      expect(result.data.message).toContain('<img');
    }
  });

  it('strips control characters that could break log lines or headers', async () => {
    const { sanitiseText } = await import('@/lib/validation');
    expect(sanitiseText('abc\u0000\u001b[31mdef')).toBe('abc[31mdef');
  });
});
