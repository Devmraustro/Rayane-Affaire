import '@/lib/server/guard';
import { getDb } from '@/db/client';
import type { Commune, Paginated, Place, PlaceFilters } from '@/types';
import { rowToMedia, type MediaRow } from './mappers';

export interface PlaceRow {
  id: string;
  slug: string;
  reference: string;
  name_fr: string;
  name_ar: string;
  description_fr: string;
  description_ar: string;
  address_fr: string;
  address_ar: string;
  commune_id: string;
  category: Place['category'];
  lat: number | null;
  lng: number | null;
  coordinate_precision: Place['coordinatePrecision'];
  location_status: Place['locationStatus'];
  verified_by: string | null;
  verified_at: string | null;
  status: Place['status'];
  is_demo: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  c_slug: string;
  c_name_fr: string;
  c_name_ar: string;
  c_wilaya_fr: string;
  c_wilaya_ar: string;
  c_wilaya_code: string;
  c_lat: number;
  c_lng: number;
  c_default_zoom: number;
  c_osm_relation_id: string | null;
  c_active: number;
}

const SELECT_PLACE = `
  SELECT p.*,
    c.slug AS c_slug, c.name_fr AS c_name_fr, c.name_ar AS c_name_ar,
    c.wilaya_fr AS c_wilaya_fr, c.wilaya_ar AS c_wilaya_ar,
    c.wilaya_code AS c_wilaya_code, c.lat AS c_lat, c.lng AS c_lng,
    c.default_zoom AS c_default_zoom, c.osm_relation_id AS c_osm_relation_id,
    c.active AS c_active
  FROM places p JOIN communes c ON c.id = p.commune_id`;

function communeOf(row: PlaceRow): Commune {
  return {
    id: row.commune_id,
    slug: row.c_slug,
    name: { fr: row.c_name_fr, ar: row.c_name_ar },
    wilaya: { fr: row.c_wilaya_fr, ar: row.c_wilaya_ar },
    wilayaCode: row.c_wilaya_code,
    center: { lat: row.c_lat, lng: row.c_lng },
    defaultZoom: row.c_default_zoom,
    osmRelationId: row.c_osm_relation_id,
    active: row.c_active === 1,
  };
}

function mediaOf(id: string) {
  return (getDb().prepare(
    `SELECT * FROM media WHERE entity_type = 'place' AND entity_id = ? ORDER BY sort_order, created_at`,
  ).all(id) as unknown as MediaRow[]).map(rowToMedia);
}

/**
 * Maps an admin row or a safe public projection. Public visitors never receive
 * unverified coordinates, even in serialized React props or page source.
 */
export function rowToPlace(row: PlaceRow, publicProjection = false): Place {
  const hidePoint = publicProjection && row.location_status !== 'verified';
  return {
    id: row.id,
    slug: row.slug,
    reference: row.reference,
    name: { fr: row.name_fr, ar: row.name_ar },
    description: { fr: row.description_fr, ar: row.description_ar },
    address: { fr: row.address_fr, ar: row.address_ar },
    commune: communeOf(row),
    category: row.category,
    coordinates: hidePoint || row.lat === null || row.lng === null
      ? null
      : { lat: row.lat, lng: row.lng },
    coordinatePrecision: row.coordinate_precision,
    locationStatus: row.location_status,
    verifiedBy: publicProjection ? null : row.verified_by,
    verifiedAt: row.verified_at,
    status: row.status,
    isDemo: row.is_demo === 1,
    media: mediaOf(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function defaultPlaceFilters(): PlaceFilters {
  return { query: '', wilayaCode: '', commune: '', category: 'all', includeDemo: false, page: 1, pageSize: 12 };
}

export function listPublicPlaces(input: Partial<PlaceFilters> = {}): Paginated<Place> {
  const filters = { ...defaultPlaceFilters(), ...input };
  const page = Math.max(1, Math.floor(filters.page));
  const pageSize = Math.min(60, Math.max(1, Math.floor(filters.pageSize)));
  const clauses = [`p.status = 'published'`];
  const params: (string | number)[] = [];
  if (!filters.includeDemo) clauses.push('p.is_demo = 0');
  if (filters.query.trim()) {
    const like = `%${filters.query.trim().toLocaleLowerCase()}%`;
    clauses.push(`(LOWER(p.name_fr) LIKE ? OR LOWER(p.name_ar) LIKE ? OR LOWER(p.description_fr) LIKE ? OR LOWER(p.description_ar) LIKE ? OR LOWER(p.address_fr) LIKE ? OR LOWER(p.address_ar) LIKE ? OR LOWER(p.reference) LIKE ?)`);
    params.push(like, like, like, like, like, like, like);
  }
  if (filters.wilayaCode) { clauses.push('c.wilaya_code = ?'); params.push(filters.wilayaCode); }
  if (filters.commune) { clauses.push('c.slug = ?'); params.push(filters.commune); }
  if (filters.category !== 'all') { clauses.push('p.category = ?'); params.push(filters.category); }
  const where = `WHERE ${clauses.join(' AND ')}`;
  const total = (getDb().prepare(`SELECT COUNT(*) AS n FROM places p JOIN communes c ON c.id=p.commune_id ${where}`).get(...params) as { n: number }).n;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const rows = getDb().prepare(`${SELECT_PLACE} ${where} ORDER BY p.published_at DESC, p.id ASC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (effectivePage - 1) * pageSize) as unknown as PlaceRow[];
  return { items: rows.map((row) => rowToPlace(row, true)), total, page: effectivePage, pageSize, totalPages };
}

export function getPublicPlaceBySlug(slug: string): Place | null {
  const row = getDb().prepare(`${SELECT_PLACE} WHERE p.slug = ? AND p.status = 'published'`).get(slug) as unknown as PlaceRow | undefined;
  return row ? rowToPlace(row, true) : null;
}

export function getPlaceById(id: string): Place | null {
  const row = getDb().prepare(`${SELECT_PLACE} WHERE p.id = ?`).get(id) as unknown as PlaceRow | undefined;
  return row ? rowToPlace(row) : null;
}

/** Draft preview uses the public location projection, never an admin-only point. */
export function getPlacePreviewById(id: string): Place | null {
  const row = getDb().prepare(`${SELECT_PLACE} WHERE p.id = ?`).get(id) as unknown as PlaceRow | undefined;
  return row ? rowToPlace(row, true) : null;
}

/** Only verified points are eligible for public maps. */
export function listVerifiedPlacePoints(): Place[] {
  return listPublicPlaces({ pageSize: 60 }).items.filter((place) =>
    place.locationStatus === 'verified' && place.coordinates !== null,
  );
}
