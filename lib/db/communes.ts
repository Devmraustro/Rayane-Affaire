import '@/lib/server/guard';
import { getDb } from '@/db/client';
import { rowToCommune, type CommuneRow } from './mappers';
import type { Commune } from '@/types';

/** Active communes, ordered for UI selectors. */
export function listCommunes(options: { activeOnly?: boolean } = {}): Commune[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM communes ${options.activeOnly === false ? '' : 'WHERE active = 1'} ORDER BY name_fr ASC`,
    )
    .all() as unknown as CommuneRow[];
  return rows.map(rowToCommune);
}

export function getCommuneBySlug(slug: string): Commune | null {
  const row = getDb().prepare('SELECT * FROM communes WHERE slug = ?').get(slug) as
    | CommuneRow
    | undefined;
  return row ? rowToCommune(row) : null;
}

export function countActiveCommunes(): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS n FROM communes WHERE active = 1')
    .get() as { n: number };
  return row.n;
}
