/**
 * Database client (server-only).
 *
 * Uses Node's built-in `node:sqlite` (Node >= 22.5) so the platform runs with
 * zero external services — no Docker, no hosted database, no credentials to
 * leak. The SQL in `db/schema.sql` is deliberately standard; moving to
 * PostgreSQL means swapping this module for `pg` and keeping the repositories.
 *
 * Never import this from a client component.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';

export type Db = DatabaseSync;

const globalForDb = globalThis as unknown as { __raDb?: Db };

/** Absolute path of the SQLite file. Override with DATABASE_PATH. */
export function databasePath(): string {
  const configured = process.env.DATABASE_PATH;
  if (configured) return resolve(configured);
  return resolve(process.cwd(), 'data', 'rayane.db');
}

/**
 * Returns a process-wide connection (cached across HMR reloads in dev).
 * Applies the pragmas that make SQLite behave like a real server: foreign keys,
 * WAL journaling, a busy timeout and a sane synchronous level.
 */
export function getDb(): Db {
  if (globalForDb.__raDb) return globalForDb.__raDb;

  const file = databasePath();
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA synchronous = NORMAL');
  globalForDb.__raDb = db;
  return db;
}

/** Schema definition, read from disk so there is one source of truth. */
export function schemaSql(): string {
  const candidates = [
    join(process.cwd(), 'db', 'schema.sql'),
    join(process.cwd(), '..', 'db', 'schema.sql'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8');
  }
  throw new Error('db/schema.sql not found — cannot initialise the database.');
}

/** Idempotent bootstrap: creates every table/index that does not exist yet. */
export function applySchema(db: Db = getDb()): void {
  db.exec(schemaSql());
}

/** Test helper: a fresh in-memory database with the real schema applied. */
export function createTestDb(): Db {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(schemaSql());
  return db;
}

/** Runs `fn` inside a transaction; rolls back on throw. */
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* the transaction may already be gone */
    }
    throw error;
  }
}
