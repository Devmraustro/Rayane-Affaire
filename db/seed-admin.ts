/**
 * Creates the first administrator — `npm run db:seed:admin`
 *
 * Credentials are NEVER hardcoded and never committed:
 *
 *   ADMIN_EMAIL=owner@rayane-affaire.dz \
 *   ADMIN_PASSWORD='a-strong-passphrase' \
 *   ADMIN_NAME='Nom du gérant' \
 *   npm run db:seed:admin
 *
 * If ADMIN_PASSWORD is omitted a cryptographically random password is generated
 * and printed exactly once. The password is never logged when supplied.
 * Running it again with the same e-mail does NOT overwrite the existing password.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { getDb, applySchema } from './client';
import { seedCommunes } from './seed-communes';
import { createAdminUser, countAdminUsers, findByEmailWithHash } from '../lib/db/admin-users';
import { validatePasswordStrength } from '../lib/server/password';

/** 4-word-ish passphrase from a crypto-random source (easy to type, hard to guess). */
function generatePassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pick = (set: string, n: number) =>
    Array.from(randomBytes(n))
      .map((b) => set[b % set.length])
      .join('');
  return `${pick(upper, 2)}${pick(alphabet, 8)}-${pick(digits, 4)}-${pick(upper, 2)}${pick(alphabet, 4)}`;
}

async function main(): Promise<void> {
  applySchema();
  seedCommunes(getDb());

  if (!process.env.DATABASE_PATH) {
    applySchema();
  }

  if (countAdminUsers() > 0) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (email && findByEmailWithHash(email)) {
      console.log(`ℹ An administrator with e-mail ${email} already exists — password left unchanged.`);
      console.log('  To rotate it: delete the row from admin_users, then run this command again.');
      return;
    }
    if (!email) {
      console.log('ℹ At least one administrator already exists. Nothing to do.');
      console.log('  To add another account, set ADMIN_EMAIL (and optionally ADMIN_PASSWORD).');
      return;
    }
  }

  const email = (process.env.ADMIN_EMAIL ?? 'admin@rayane-affaire.local').trim().toLowerCase();
  const fullName = process.env.ADMIN_NAME ?? 'Administrateur RAYANE AFFAIRE';
  const provided = process.env.ADMIN_PASSWORD;
  const password = provided ?? generatePassword();

  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    console.error(`✖ ${strengthError}`);
    console.error('  Example: ADMIN_PASSWORD="Béjaïa-Rayane-2024!" npm run db:seed:admin');
    process.exitCode = 1;
    return;
  }

  const user = await createAdminUser({ email, password, fullName, role: 'owner', mustChangePassword: true });

  console.log('✔ Administrator created');
  console.log(`  e-mail : ${user.email}`);
  console.log(`  role   : ${user.role}`);
  if (!provided) {
    console.log('');
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │ PASSWORD (shown once — store it in your password manager)    │');
    console.log(`  │ ${password.padEnd(59)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
    console.log('');
  }
  console.log('  Sign in at /admin/login');
}

// Keep the linter honest about the unused import in the early-return path.
void readFileSync;
void join;

main().catch((error: unknown) => {
  console.error('✖ Failed to create the administrator:', error);
  process.exitCode = 1;
});
