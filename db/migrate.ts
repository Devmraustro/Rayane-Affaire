/**
 * Migration runner: `npm run db:migrate`
 *
 * Safe by construction:
 *   * `db/schema.sql` only ever uses CREATE ... IF NOT EXISTS, so running it
 *     repeatedly is a no-op.
 *   * Destructive changes must be added as numbered SQL files in `db/migrations`
 *     applied once and recorded in `schema_migrations`.
 *   * Commune reference data is upserted (never deleted) because listings
 *     reference it via a RESTRICT foreign key.
 */
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getDb, applySchema, databasePath } from './client';
import { BEJAIA_COMMUNES } from './communes';
import { seedCommunes } from './seed-communes';

function now(): string {
  return new Date().toISOString();
}

function applyVersionedMigrations(db: ReturnType<typeof getDb>): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const dir = join(process.cwd(), 'db', 'migrations');
  if (!existsSync(dir)) return [];
  const applied = new Set(
    (db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]).map((r) => r.id),
  );
  const done: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (applied.has(file)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(readFileSync(join(dir, file), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(file, now());
      db.exec('COMMIT');
      done.push(file);
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  return done;
}

function main(): void {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  const db = getDb();
  applySchema(db);
  const migrated = applyVersionedMigrations(db);
  seedCommunes(db);

  const counts = {
    communes: (db.prepare('SELECT COUNT(*) AS n FROM communes').get() as { n: number }).n,
    properties: (db.prepare('SELECT COUNT(*) AS n FROM properties').get() as { n: number }).n,
    vehicles: (db.prepare('SELECT COUNT(*) AS n FROM vehicles').get() as { n: number }).n,
    adminUsers: (db.prepare('SELECT COUNT(*) AS n FROM admin_users').get() as { n: number }).n,
  };

  console.log(`✔ Database ready: ${databasePath()}`);
  if (migrated.length) console.log(`✔ Applied migrations: ${migrated.join(', ')}`);
  console.log('  communes   :', counts.communes, `(${BEJAIA_COMMUNES.length} Béjaïa, OSM-verified centroids)`);
  console.log('  properties :', counts.properties);
  console.log('  vehicles   :', counts.vehicles);
  console.log('  admin users:', counts.adminUsers);
  if (counts.adminUsers === 0) {
    console.log('\n  Next: create the first administrator →  npm run db:seed:admin');
  }
}

main();
