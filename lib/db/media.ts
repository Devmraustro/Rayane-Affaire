import '@/lib/server/guard';
import { getDb } from '@/db/client';
import { randomUUID } from 'node:crypto';

/** Media repository — one table serves both listing kinds. */

export function listMedia(entityType: 'property' | 'vehicle', entityId: string) {
  return getDb()
    .prepare(
      `SELECT * FROM media WHERE entity_type = ? AND entity_id = ? ORDER BY sort_order ASC`,
    )
    .all(entityType, entityId);
}

export function addMedia(input: {
  entityType: 'property' | 'vehicle';
  entityId: string;
  url: string;
  altFr: string;
  altAr: string;
  width?: number | null;
  height?: number | null;
  credit?: string | null;
  sourceUrl?: string | null;
  license?: string | null;
}): string {
  const db = getDb();
  const id = randomUUID();
  const next = (
    db
      .prepare(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM media WHERE entity_type = ? AND entity_id = ?`,
      )
      .get(input.entityType, input.entityId) as { n: number }
  ).n;
  db.prepare(
    `INSERT INTO media (id, entity_type, entity_id, url, alt_fr, alt_ar, width, height,
                        sort_order, credit, source_url, license, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.entityType,
    input.entityId,
    input.url,
    input.altFr,
    input.altAr,
    input.width ?? null,
    input.height ?? null,
    next,
    input.credit ?? null,
    input.sourceUrl ?? null,
    input.license ?? null,
    new Date().toISOString(),
  );
  return id;
}

export function deleteMedia(id: string): boolean {
  return getDb().prepare('DELETE FROM media WHERE id = ?').run(id).changes > 0;
}

export function reorderMedia(id: string, sortOrder: number): void {
  getDb().prepare('UPDATE media SET sort_order = ? WHERE id = ?').run(sortOrder, id);
}

export function countMedia(entityType: 'property' | 'vehicle', entityId: string): number {
  return (
    getDb()
      .prepare('SELECT COUNT(*) AS n FROM media WHERE entity_type = ? AND entity_id = ?')
      .get(entityType, entityId) as { n: number }
  ).n;
}
