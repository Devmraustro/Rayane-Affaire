import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTempDbEnv, initSchema, type TempDb } from './helpers/temp-db';

let env: TempDb;
const previous = { ...process.env };
beforeAll(async () => { env = createTempDbEnv(); await initSchema(); });
afterAll(() => { process.env = previous; env.cleanup(); });

describe('isolated preview bootstrap', () => {
  it('creates only synthetic settings/accounts and verifies the generated scrypt credentials', async () => {
    process.env.PREVIEW_ADMIN_EMAIL = 'preview-owner@test.invalid';
    process.env.PREVIEW_ADMIN_PASSWORD = 'Preview-Owner-2026!';
    process.env.PREVIEW_EDITOR_EMAIL = 'preview-editor@test.invalid';
    process.env.PREVIEW_EDITOR_PASSWORD = 'Preview-Editor-2026!';
    const { bootstrapEphemeralPreview } = await import('@/db/preview-bootstrap');
    const { getDb } = await import('@/db/client');
    const { verifyPassword } = await import('@/lib/server/password');
    const db = getDb();
    bootstrapEphemeralPreview(db);
    const owner = db.prepare('SELECT * FROM admin_users WHERE email=?').get('preview-owner@test.invalid') as { password_hash: string; must_change_password: number };
    expect(owner.password_hash).not.toContain('Preview-Owner-2026!');
    expect(await verifyPassword('Preview-Owner-2026!', owner.password_hash)).toBe(true);
    expect(await verifyPassword('incorrect', owner.password_hash)).toBe(false);
    expect(owner.must_change_password).toBe(1);
    expect((db.prepare('SELECT COUNT(*) n FROM properties').get() as { n: number }).n).toBe(0);
    expect((db.prepare('SELECT COUNT(*) n FROM vehicles').get() as { n: number }).n).toBe(0);
    expect((db.prepare('SELECT COUNT(*) n FROM places').get() as { n: number }).n).toBe(0);
    expect(db.prepare('SELECT value FROM settings WHERE key=\'contact_email\'').get()).toMatchObject({ value: '' });
    expect(db.prepare('SELECT value FROM settings WHERE key=\'contact_phone\'').get()).toMatchObject({ value: '' });
  });

  it('denies all indexing for a preview deployment', async () => {
    process.env.APP_ENV = 'preview';
    const { default: robots } = await import('@/app/robots');
    expect(robots()).toEqual({ rules: [{ userAgent: '*', disallow: '/' }] });
  });
});
