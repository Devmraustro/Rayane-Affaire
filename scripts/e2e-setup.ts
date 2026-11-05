import fs from 'node:fs';
import path from 'node:path';
import { applySchema, getDb } from '../db/client';
import { seedCommunes } from '../db/seed-communes';
import { createAdminUser } from '../lib/db/admin-users';

const databasePath = process.env.DATABASE_PATH || './data/e2e.db';
const uploadDir = process.env.UPLOAD_DIR || './data/e2e-uploads';
for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${databasePath}${suffix}`, { force: true });
fs.rmSync(uploadDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const db = getDb();
applySchema(db);
seedCommunes(db);
const now = new Date().toISOString();
const defaults: Array<[string, string]> = [
  ['site_name_fr', 'Rayane Affaire'], ['site_name_ar', 'ريان أفير'],
  ['contact_email', 'e2e@rayane-affaire.invalid'], ['contact_phone', '+213 555 000 000'],
  ['whatsapp', '+213555000000'], ['address_fr', 'Béjaïa, Algérie'], ['address_ar', 'بجاية، الجزائر'],
  ['google_maps_embed', ''], ['facebook_url', ''], ['instagram_url', ''], ['tiktok_url', ''],
  ['vehicle_rental_enabled', 'false'], ['vehicle_public_visible', 'false'],
];
const setting = db.prepare('INSERT OR IGNORE INTO settings (key,value,updated_at) VALUES (?,?,?)');
for (const [key, value] of defaults) setting.run(key, value, now);

async function main() {
  await createAdminUser({
    email: process.env.E2E_OWNER_EMAIL!, password: process.env.E2E_OWNER_PASSWORD!,
    fullName: 'E2E Owner', role: 'owner', mustChangePassword: false,
    notificationEmail: null,
  });
  await createAdminUser({
    email: process.env.E2E_EDITOR_EMAIL!, password: process.env.E2E_EDITOR_PASSWORD!,
    fullName: 'E2E Editor', role: 'editor', mustChangePassword: false,
    notificationEmail: null,
  });
  console.log('E2E database reset: 11 communes, isolated owner/editor, no production data.');
  db.close();
}

void main();
