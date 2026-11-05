/**
 * Opt-in Vercel preview bootstrap. This is deliberately gated by BOTH
 * VERCEL_ENV=preview and PREVIEW_EPHEMERAL=1 in db/client.ts. It must never run
 * against production or a durable database.
 *
 * Vercel's local filesystem is ephemeral and is not shared reliably between
 * route functions. This creates an empty synthetic schema/credentials per cold
 * start for public smoke checks only; the persistent client-review preview uses
 * the ordinary migration + seed workflow documented in docs/PREVIEW.md.
 */
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import type { Db } from './client';
import { seedCommunes } from './seed-communes';

function previewHash(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize('NFKC'), salt, 64, { N: 32768, r: 8, p: 1, maxmem: 512 * 1024 * 1024 });
  return ['scrypt', 32768, 8, 1, salt.toString('base64'), hash.toString('base64')].join('$');
}

export function bootstrapEphemeralPreview(db: Db): void {
  const now = new Date().toISOString();
  seedCommunes(db);
  const defaults: Array<[string, string]> = [
    ['site_name_fr', 'Rayane Affaire — Préproduction'], ['site_name_ar', 'ريان أفير — معاينة'],
    ['contact_email', ''], ['contact_phone', ''],
    ['whatsapp', ''], ['address_fr', ''], ['address_ar', ''],
    ['google_maps_embed', ''], ['facebook_url', ''], ['instagram_url', ''], ['tiktok_url', ''],
    ['vehicle_rental_enabled', 'false'], ['vehicle_public_visible', 'false'],
  ];
  const setting = db.prepare('INSERT OR IGNORE INTO settings (key,value,updated_at) VALUES (?,?,?)');
  for (const [key, value] of defaults) setting.run(key, value, now);

  const insert = db.prepare(`INSERT OR IGNORE INTO admin_users
    (id,email,password_hash,full_name,role,active,must_change_password,notification_email,
     notify_new_inquiry,notify_reservation,last_login_at,created_at,updated_at)
    VALUES (?,?,?,?,?,1,1,NULL,0,0,NULL,?,?)`);
  const accounts = [
    { email: process.env.PREVIEW_ADMIN_EMAIL, password: process.env.PREVIEW_ADMIN_PASSWORD, name: process.env.PREVIEW_ADMIN_NAME || 'Preview Owner', role: 'owner' },
    { email: process.env.PREVIEW_EDITOR_EMAIL, password: process.env.PREVIEW_EDITOR_PASSWORD, name: process.env.PREVIEW_EDITOR_NAME || 'Preview Editor', role: 'editor' },
  ];
  for (const account of accounts) {
    if (!account.email || !account.password || account.password.length < 12) continue;
    insert.run(randomUUID(), account.email.toLowerCase(), previewHash(account.password), account.name, account.role, now, now);
  }
}
