import '@/lib/server/guard';
import { randomUUID } from 'node:crypto';
import { getDb, transaction } from '@/db/client';
import type { Place } from '@/types';
import type { PlaceWritePayload } from '@/lib/validation';
import { uniqueSlug } from '@/lib/slug';
import { ListingError } from './admin-listings';
import { countMedia } from './media';
import { getPlaceById } from './places';

function nextReference(): string {
  const db = getDb();
  let sequence = (db.prepare('SELECT COUNT(*) AS n FROM places').get() as { n: number }).n + 1;
  for (;;) {
    const candidate = `RA-L-${String(sequence).padStart(4, '0')}`;
    if (!db.prepare('SELECT 1 FROM places WHERE reference = ?').get(candidate)) return candidate;
    sequence += 1;
  }
}

function communeId(slug: string): string {
  const row = getDb().prepare('SELECT id FROM communes WHERE slug = ? AND active = 1').get(slug) as { id: string } | undefined;
  if (!row) throw new ListingError('COMMUNE_REQUIRED', 'Unknown or inactive commune.');
  return row.id;
}

function assertPublishable(id: string, status: Place['status']): void {
  if (status === 'published' && countMedia('place', id) === 0) {
    throw new ListingError('MEDIA_REQUIRED', 'Publishing a place requires at least one image.');
  }
}

function pointOf(payload: PlaceWritePayload) {
  if (payload.lat == null || payload.lng == null || payload.coordinatePrecision === 'pending') {
    return { lat: null, lng: null, precision: 'pending' as const };
  }
  return { lat: payload.lat, lng: payload.lng, precision: payload.coordinatePrecision };
}

export function createPlace(payload: PlaceWritePayload): Place {
  const db = getDb();
  return transaction(db, () => {
    const id = randomUUID();
    // A direct create-as-published request cannot bypass the image rule.
    assertPublishable(id, payload.status);
    const now = new Date().toISOString();
    const point = pointOf(payload);
    const slug = uniqueSlug(payload.nameFr || payload.nameAr, (candidate) =>
      Boolean(db.prepare('SELECT 1 FROM places WHERE slug = ?').get(candidate)),
    );
    db.prepare(`INSERT INTO places (
      id, slug, reference, name_fr, name_ar, description_fr, description_ar,
      address_fr, address_ar, commune_id, category, lat, lng, coordinate_precision,
      location_status, verified_by, verified_at, status, is_demo, published_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, 0, ?, ?, ?)`)
      .run(id, slug, nextReference(), payload.nameFr, payload.nameAr,
        payload.descriptionFr, payload.descriptionAr, payload.addressFr, payload.addressAr,
        communeId(payload.communeSlug), payload.category, point.lat, point.lng, point.precision,
        point.lat === null ? 'missing' : 'unverified', payload.status,
        payload.status === 'published' ? now : null, now, now);
    return getPlaceById(id) as Place;
  });
}

export function updatePlace(id: string, payload: PlaceWritePayload): Place {
  const db = getDb();
  return transaction(db, () => {
    const existing = db.prepare(`SELECT lat, lng, coordinate_precision, location_status, verified_by, verified_at FROM places WHERE id = ?`).get(id) as {
      lat: number | null; lng: number | null; coordinate_precision: string;
      location_status: Place['locationStatus']; verified_by: string | null; verified_at: string | null;
    } | undefined;
    if (!existing) throw new ListingError('NOT_FOUND', 'Place not found.');
    assertPublishable(id, payload.status);
    const point = pointOf(payload);
    const unchanged = existing.lat === point.lat && existing.lng === point.lng &&
      existing.coordinate_precision === point.precision;
    const keepVerification = unchanged && existing.location_status === 'verified';
    const locationStatus = point.lat === null ? 'missing' : keepVerification ? 'verified' : 'unverified';
    const now = new Date().toISOString();
    db.prepare(`UPDATE places SET
      name_fr=?, name_ar=?, description_fr=?, description_ar=?, address_fr=?, address_ar=?,
      commune_id=?, category=?, lat=?, lng=?, coordinate_precision=?, location_status=?,
      verified_by=?, verified_at=?, status=?,
      published_at=CASE WHEN ?='published' AND published_at IS NULL THEN ? ELSE published_at END,
      updated_at=? WHERE id=?`)
      .run(payload.nameFr, payload.nameAr, payload.descriptionFr, payload.descriptionAr,
        payload.addressFr, payload.addressAr, communeId(payload.communeSlug), payload.category,
        point.lat, point.lng, point.precision, locationStatus,
        keepVerification ? existing.verified_by : null,
        keepVerification ? existing.verified_at : null,
        payload.status, payload.status, now, now, id);
    return getPlaceById(id) as Place;
  });
}

/** Explicit, audited editor action. There is intentionally no payload flag in
 * create/update that could mark a geocoder result or map click as verified. */
export function setPlaceLocationVerification(id: string, verified: boolean, actorId: string): Place {
  const db = getDb();
  return transaction(db, () => {
    const existing = db.prepare('SELECT lat, lng FROM places WHERE id = ?').get(id) as { lat: number | null; lng: number | null } | undefined;
    if (!existing) throw new ListingError('NOT_FOUND', 'Place not found.');
    if (verified && (existing.lat === null || existing.lng === null)) {
      throw new ListingError('COORDINATES_REQUIRED', 'A location cannot be verified before coordinates are supplied.');
    }
    const now = new Date().toISOString();
    const status = existing.lat === null ? 'missing' : verified ? 'verified' : 'unverified';
    db.prepare(`UPDATE places SET location_status=?, verified_by=?, verified_at=?, updated_at=? WHERE id=?`)
      .run(status, verified ? actorId : null, verified ? now : null, now, id);
    return getPlaceById(id) as Place;
  });
}

export function setPlaceStatus(id: string, status: Place['status']): Place | null {
  assertPublishable(id, status);
  const now = new Date().toISOString();
  getDb().prepare(`UPDATE places SET status=?, published_at=CASE WHEN ?='published' AND published_at IS NULL THEN ? ELSE published_at END, updated_at=? WHERE id=?`)
    .run(status, status, now, now, id);
  return getPlaceById(id);
}

/** Returns generated upload URLs for post-commit filesystem cleanup. */
export function deletePlace(id: string): string[] | null {
  const db = getDb();
  return transaction(db, () => {
    if (!db.prepare('SELECT 1 FROM places WHERE id = ?').get(id)) return null;
    const urls = (db.prepare(`SELECT url FROM media WHERE entity_type='place' AND entity_id=?`).all(id) as { url: string }[]).map((row) => row.url);
    db.prepare(`DELETE FROM media WHERE entity_type='place' AND entity_id=?`).run(id);
    db.prepare('DELETE FROM places WHERE id = ?').run(id);
    return urls;
  });
}

export interface AdminPlaceRow {
  id: string; reference: string; nameFr: string; nameAr: string;
  category: Place['category']; commune: string; wilaya: string;
  status: Place['status']; locationStatus: Place['locationStatus'];
  coordinatePrecision: Place['coordinatePrecision']; mediaCount: number;
  isDemo: boolean; updatedAt: string;
}

export function listAdminPlaces(filters: { status?: string; query?: string; location?: string } = {}): AdminPlaceRow[] {
  const clauses: string[] = [];
  const params: string[] = [];
  if (filters.status && filters.status !== 'all') { clauses.push('p.status = ?'); params.push(filters.status); }
  if (filters.location && filters.location !== 'all') { clauses.push('p.location_status = ?'); params.push(filters.location); }
  if (filters.query?.trim()) {
    const like = `%${filters.query.trim().toLocaleLowerCase()}%`;
    clauses.push('(LOWER(p.name_fr) LIKE ? OR LOWER(p.name_ar) LIKE ? OR LOWER(p.reference) LIKE ?)');
    params.push(like, like, like);
  }
  const rows = getDb().prepare(`SELECT p.*, c.name_fr AS commune_name, c.wilaya_fr AS wilaya_name,
    (SELECT COUNT(*) FROM media m WHERE m.entity_type='place' AND m.entity_id=p.id) AS media_count
    FROM places p JOIN communes c ON c.id=p.commune_id
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY p.updated_at DESC LIMIT 300`)
    .all(...params) as unknown as {
      id: string; reference: string; name_fr: string; name_ar: string;
      category: Place['category']; commune_name: string; wilaya_name: string;
      status: Place['status']; location_status: Place['locationStatus'];
      coordinate_precision: Place['coordinatePrecision']; media_count: number;
      is_demo: number; updated_at: string;
    }[];
  return rows.map((row) => ({
    id: row.id, reference: row.reference, nameFr: row.name_fr, nameAr: row.name_ar,
    category: row.category, commune: row.commune_name, wilaya: row.wilaya_name,
    status: row.status, locationStatus: row.location_status,
    coordinatePrecision: row.coordinate_precision, mediaCount: row.media_count,
    isDemo: row.is_demo === 1, updatedAt: row.updated_at,
  }));
}
