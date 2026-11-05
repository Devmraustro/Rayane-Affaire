import '@/lib/server/guard';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

type ScryptOptions = { N: number; r: number; p: number; maxmem?: number };
const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/**
 * Password hashing with scrypt (memory-hard, in the Node standard library).
 *
 * Stored format: `scrypt$N$r$p$<salt-b64>$<hash-b64>` — parameters travel with
 * the hash so they can be raised later without invalidating existing accounts.
 *
 * Argon2id is the ideal choice, but it requires a native dependency; scrypt with
 * N=2^15 is an accepted, OWASP-listed alternative and keeps the deployment
 * dependency-free. See docs/SECURITY_AUDIT.md.
 */
const PARAMS = { N: 1 << 15, r: 8, p: 1, keylen: 64 } as const;

/** One-time credentials for owner-provisioned accounts. Returned once by the
 * API, never persisted in plaintext or included in audit details. */
export function temporaryPassword(): string {
  return `Ra9-${randomBytes(15).toString('base64url')}-zA7`;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, PARAMS.keylen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: 512 * 1024 * 1024,
  });
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  try {
    const actual = await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 512 * 1024 * 1024,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Minimum policy enforced when creating a password (seed script / API). */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) return 'Le mot de passe doit contenir au moins 12 caractères.';
  if (!/[a-z]/.test(password)) return 'Le mot de passe doit contenir une minuscule.';
  if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir une majuscule.';
  if (!/[0-9]/.test(password)) return 'Le mot de passe doit contenir un chiffre.';
  return null;
}
