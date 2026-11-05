import '@/lib/server/guard';
import { existsSync, readdirSync } from 'node:fs';
import { getDb } from '@/db/client';
import { removeStoredFile, uploadsDirectory } from './upload';

/** Deletes only application-generated, unreferenced upload names. Other files in
 * the directory are never touched. Also removes legacy media rows whose parent
 * listing no longer exists. */
export function cleanupOrphanedMedia(): { filesRemoved: number; rowsRemoved: number } {
  const db = getDb(); let rowsRemoved = 0;
  const rows = db.prepare('SELECT id, entity_type, entity_id, url FROM media').all() as { id: string; entity_type: 'property'|'vehicle'|'place'; entity_id: string; url: string }[];
  for (const row of rows) {
    const table = row.entity_type === 'property' ? 'properties' : row.entity_type === 'vehicle' ? 'vehicles' : 'places';
    if (!db.prepare(`SELECT 1 FROM ${table} WHERE id=?`).get(row.entity_id)) {
      rowsRemoved += Number(db.prepare('DELETE FROM media WHERE id=?').run(row.id).changes);
      if (!db.prepare('SELECT 1 FROM media WHERE url=?').get(row.url)) removeStoredFile(row.url);
    }
  }
  let filesRemoved = 0; const directory = uploadsDirectory();
  if (!existsSync(directory)) return { filesRemoved, rowsRemoved };
  const generated = /^[a-f0-9-]{36}\.(?:jpg|png|webp|avif)$/;
  for (const file of readdirSync(directory).slice(0, 5000)) {
    if (!generated.test(file)) continue;
    const url = `/api/media/${file}`;
    if (!db.prepare('SELECT 1 FROM media WHERE url=?').get(url) && removeStoredFile(url)) filesRemoved += 1;
  }
  return { filesRemoved, rowsRemoved };
}
