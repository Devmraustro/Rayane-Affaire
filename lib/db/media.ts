import '@/lib/server/guard';
import { getDb, transaction } from '@/db/client';
import { randomUUID } from 'node:crypto';
import type { MediaRow } from './mappers';

export type MediaEntityType = 'property' | 'vehicle' | 'place';

export class MediaError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export function listMedia(entityType: MediaEntityType, entityId: string) {
  return getDb().prepare(
    `SELECT * FROM media WHERE entity_type = ? AND entity_id = ? ORDER BY sort_order ASC, created_at ASC`,
  ).all(entityType, entityId) as unknown as MediaRow[];
}

export function getMedia(id: string): MediaRow | null {
  return (getDb().prepare('SELECT * FROM media WHERE id = ?').get(id) as unknown as MediaRow | undefined) ?? null;
}

export function addMedia(input: {
  entityType: MediaEntityType;
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
  const next = (db.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM media WHERE entity_type = ? AND entity_id = ?`,
  ).get(input.entityType, input.entityId) as { n: number }).n;
  db.prepare(`INSERT INTO media (id, entity_type, entity_id, url, alt_fr, alt_ar, width, height,
      sort_order, credit, source_url, license, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.entityType, input.entityId, input.url, input.altFr, input.altAr,
      input.width ?? null, input.height ?? null, next, input.credit ?? null,
      input.sourceUrl ?? null, input.license ?? null, new Date().toISOString());
  return id;
}

export function deleteMedia(id: string): boolean {
  return getDb().prepare('DELETE FROM media WHERE id = ?').run(id).changes > 0;
}

/** Atomic, ownership-checked reorder. Every supplied id must belong to the same
 * entity and the complete gallery must be supplied exactly once. */
export function reorderMediaItems(entityType: MediaEntityType, entityId: string, orderedIds: string[]): void {
  if (orderedIds.length === 0 || new Set(orderedIds).size !== orderedIds.length) {
    throw new MediaError('INVALID_MEDIA_ORDER', 'A complete, duplicate-free media order is required.');
  }
  const db = getDb();
  transaction(db, () => {
    const existing = listMedia(entityType, entityId);
    if (existing.length !== orderedIds.length || existing.some((item) => !orderedIds.includes(item.id))) {
      throw new MediaError('INVALID_MEDIA_ORDER', 'Media do not belong to this entity or the order is incomplete.');
    }
    const update = db.prepare(`UPDATE media SET sort_order=? WHERE id=? AND entity_type=? AND entity_id=?`);
    orderedIds.forEach((id, index) => update.run(index, id, entityType, entityId));
  });
}

export function mediaUrlsForEntity(entityType: MediaEntityType, entityId: string): string[] {
  return (getDb().prepare('SELECT url FROM media WHERE entity_type=? AND entity_id=?')
    .all(entityType, entityId) as { url: string }[]).map((row) => row.url);
}

export function countMedia(entityType: MediaEntityType, entityId: string): number {
  return (getDb().prepare('SELECT COUNT(*) AS n FROM media WHERE entity_type = ? AND entity_id = ?')
    .get(entityType, entityId) as { n: number }).n;
}
