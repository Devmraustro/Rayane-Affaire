/** Shared commune upsert, used by both the migrator and the seed scripts. */
import type { Db } from './client';
import { BEJAIA_COMMUNES } from './communes';

export function seedCommunes(db: Db): number {
  const upsert = db.prepare(`
    INSERT INTO communes (id, slug, name_fr, name_ar, wilaya_fr, wilaya_ar, wilaya_code,
                          lat, lng, default_zoom, osm_relation_id, source, active, created_at)
    VALUES (?, ?, ?, ?, 'Wilaya de Béjaïa', 'ولاية بجاية', '06', ?, ?, ?, ?, 'osm-nominatim', 1, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug, name_fr = excluded.name_fr, name_ar = excluded.name_ar,
      lat = excluded.lat, lng = excluded.lng, default_zoom = excluded.default_zoom,
      osm_relation_id = excluded.osm_relation_id, source = excluded.source
  `);
  const now = new Date().toISOString();
  for (const c of BEJAIA_COMMUNES) {
    upsert.run(c.id, c.slug, c.nameFr, c.nameAr, c.lat, c.lng, c.defaultZoom, c.osmRelationId, now);
  }
  return BEJAIA_COMMUNES.length;
}
