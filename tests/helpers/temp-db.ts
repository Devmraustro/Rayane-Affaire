import { tmpdir } from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Test database helper.
 *
 * Every test file gets its own throwaway SQLite file so tests are isolated and
 * can run in parallel forks. `DATABASE_PATH` is set BEFORE the modules under
 * test are imported (they read it lazily on first connection), which is why the
 * helpers below use dynamic `import()`.
 */
export interface TempDb {
  dir: string;
  path: string;
  cleanup: () => void;
}

export function createTempDbEnv(): TempDb {
  const dir = mkdtempSync(join(tmpdir(), 'rayane-test-'));
  const path = join(dir, `${randomUUID()}.db`);
  process.env.DATABASE_PATH = path;
  process.env.SESSION_SECRET = 'test-session-secret-value-at-least-32-chars';
  process.env.UPLOAD_DIR = join(dir, 'uploads');
  return {
    dir,
    path,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* best effort on CI filesystems */
      }
    },
  };
}

/** Applies the schema and seeds the verified commune reference data. */
export async function initSchema(): Promise<void> {
  const { applySchema } = await import('@/db/client');
  const { seedCommunes } = await import('@/db/seed-communes');
  const { getDb } = await import('@/db/client');
  applySchema();
  seedCommunes(getDb());
}
