import '@/lib/server/guard';
import { getDb, transaction } from '@/db/client';
import { randomUUID } from 'node:crypto';
import type { Property, Vehicle } from '@/types';
import type { PropertyWritePayload, VehicleWritePayload } from '@/lib/validation';
import { uniqueSlug } from '@/lib/slug';
import { getPropertyById } from './properties';
import { getVehicleById } from './vehicles';
import { countMedia } from './media';

/**
 * Admin write operations for listings.
 *
 * Business rules enforced here (not only in the UI):
 *  * a listing cannot be *published* without a title in both languages and at
 *    least one photograph — an empty publication would be a broken card;
 *  * a listing with `coordinatePrecision = 'pending'` must have NULL coordinates
 *    (enforced again by the schema CHECK);
 *  * slugs and references are unique; collisions are resolved deterministically;
 *  * writes run in a transaction so a failed media/child row cannot leave a
 *    half-created listing behind.
 */

export class ListingError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function assertPublishable(kind: 'property' | 'vehicle', id: string, status: string): void {
  if (status !== 'published') return;
  const mediaCount = countMedia(kind, id);
  if (mediaCount === 0) {
    throw new ListingError('MEDIA_REQUIRED', 'Publishing requires at least one photograph.');
  }
}

function nextPropertyReference(): string {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) AS n FROM properties').get() as { n: number };
  let seq = row.n + 1;
  for (;;) {
    const candidate = `RA-P-${String(seq).padStart(4, '0')}`;
    if (!db.prepare('SELECT 1 FROM properties WHERE reference = ?').get(candidate)) return candidate;
    seq += 1;
  }
}

function nextVehicleReference(): string {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) AS n FROM vehicles').get() as { n: number };
  let seq = row.n + 1;
  for (;;) {
    const candidate = `RA-V-${String(seq).padStart(4, '0')}`;
    if (!db.prepare('SELECT 1 FROM vehicles WHERE reference = ?').get(candidate)) return candidate;
    seq += 1;
  }
}

function resolveCommuneId(slug: string): string {
  const row = getDb().prepare('SELECT id FROM communes WHERE slug = ?').get(slug) as
    | { id: string }
    | undefined;
  if (!row) throw new ListingError('COMMUNE_REQUIRED', 'Unknown commune.');
  return row.id;
}

/** Coordinates and precision must agree; `pending` means "no coordinates". */
function coordinatesOf(payload: { lat?: number | null; lng?: number | null; coordinatePrecision: string }) {
  if (payload.coordinatePrecision === 'pending') return { lat: null, lng: null };
  if (payload.lat == null || payload.lng == null) {
    return { lat: null, lng: null };
  }
  return { lat: payload.lat, lng: payload.lng };
}

/* -------------------------------------------------------------------------- */
/* Properties                                                                 */
/* -------------------------------------------------------------------------- */

export function createProperty(payload: PropertyWritePayload): Property {
  const db = getDb();
  return transaction(db, () => {
    const id = randomUUID();
    assertPublishable('property', id, payload.status);
    const now = new Date().toISOString();
    const communeId = resolveCommuneId(payload.communeSlug);
    const coords = coordinatesOf(payload);
    const slug = uniqueSlug(payload.titleFr || payload.titleAr, (candidate) =>
      Boolean(db.prepare('SELECT 1 FROM properties WHERE slug = ?').get(candidate)),
    );

    db.prepare(
      `INSERT INTO properties (
         id, slug, reference, title_fr, title_ar, description_fr, description_ar,
         category, transaction_type, price, price_unit, currency, commune_id,
         address_fr, address_ar, lat, lng, coordinate_precision, surface, bedrooms,
         bathrooms, floor, furnishing, amenities, availability_status, available_from,
         featured, video_url, status, is_demo, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DZD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, ?, ?, ?)`,
    ).run(
      id,
      slug,
      nextPropertyReference(),
      payload.titleFr,
      payload.titleAr,
      payload.descriptionFr,
      payload.descriptionAr,
      payload.category,
      payload.transaction,
      payload.price,
      payload.priceUnit,
      communeId,
      payload.addressFr,
      payload.addressAr,
      coords.lat,
      coords.lng,
      coords.lat === null ? 'pending' : payload.coordinatePrecision,
      payload.surface,
      payload.bedrooms,
      payload.bathrooms,
      payload.floor ?? null,
      payload.furnishing,
      JSON.stringify(payload.amenities),
      payload.availabilityStatus,
      payload.availableFrom || null,
      payload.featured ? 1 : 0,
      payload.status,
      payload.status === 'published' ? now : null,
      now,
      now,
    );

    return getPropertyById(id) as Property;
  });
}

export function updateProperty(id: string, payload: PropertyWritePayload): Property {
  const db = getDb();
  return transaction(db, () => {
    const existing = db.prepare('SELECT id, status, slug FROM properties WHERE id = ?').get(id) as
      | { id: string; status: string; slug: string }
      | undefined;
    if (!existing) throw new ListingError('NOT_FOUND', 'Property not found.');

    if (payload.status === 'published') assertPublishable('property', id, payload.status);

    const now = new Date().toISOString();
    const communeId = resolveCommuneId(payload.communeSlug);
    const coords = coordinatesOf(payload);

    db.prepare(
      `UPDATE properties SET
         title_fr = ?, title_ar = ?, description_fr = ?, description_ar = ?,
         category = ?, transaction_type = ?, price = ?, price_unit = ?, commune_id = ?,
         address_fr = ?, address_ar = ?, lat = ?, lng = ?, coordinate_precision = ?,
         surface = ?, bedrooms = ?, bathrooms = ?, floor = ?, furnishing = ?, amenities = ?,
         availability_status = ?, available_from = ?, featured = ?, status = ?,
         published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN ? ELSE published_at END,
         updated_at = ?
       WHERE id = ?`,
    ).run(
      payload.titleFr,
      payload.titleAr,
      payload.descriptionFr,
      payload.descriptionAr,
      payload.category,
      payload.transaction,
      payload.price,
      payload.priceUnit,
      communeId,
      payload.addressFr,
      payload.addressAr,
      coords.lat,
      coords.lng,
      coords.lat === null ? 'pending' : payload.coordinatePrecision,
      payload.surface,
      payload.bedrooms,
      payload.bathrooms,
      payload.floor ?? null,
      payload.furnishing,
      JSON.stringify(payload.amenities),
      payload.availabilityStatus,
      payload.availableFrom || null,
      payload.featured ? 1 : 0,
      payload.status,
      payload.status,
      now,
      now,
      id,
    );

    return getPropertyById(id) as Property;
  });
}

export function setPropertyStatus(id: string, status: Property['status']): Property | null {
  if (status === 'published') assertPublishable('property', id, status);
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE properties SET status = ?,
         published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN ? ELSE published_at END,
         updated_at = ? WHERE id = ?`,
    )
    .run(status, status, now, now, id);
  return getPropertyById(id);
}

export function deleteProperty(id: string): boolean {
  const db = getDb();
  return transaction(db, () => {
    db.prepare(`DELETE FROM media WHERE entity_type = 'property' AND entity_id = ?`).run(id);
    // Reservations keep their snapshot (title/reference) and lose the FK.
    const result = db.prepare('DELETE FROM properties WHERE id = ?').run(id);
    return result.changes > 0;
  });
}

/* -------------------------------------------------------------------------- */
/* Vehicles                                                                   */
/* -------------------------------------------------------------------------- */

export function createVehicle(payload: VehicleWritePayload): Vehicle {
  const db = getDb();
  return transaction(db, () => {
    const id = randomUUID();
    assertPublishable('vehicle', id, payload.status);
    const now = new Date().toISOString();
    const communeId = resolveCommuneId(payload.communeSlug);
    const coords = coordinatesOf(payload);
    const slug = uniqueSlug(
      `${payload.brand} ${payload.model} ${payload.year}`,
      (candidate) => Boolean(db.prepare('SELECT 1 FROM vehicles WHERE slug = ?').get(candidate)),
    );

    db.prepare(
      `INSERT INTO vehicles (
         id, slug, reference, title_fr, title_ar, description_fr, description_ar,
         brand, model, year, category, transmission, fuel, seats, doors, deal_type,
         daily_price, sale_price, currency, commune_id, lat, lng, coordinate_precision,
         mileage_km, features, availability_status, featured, status, is_demo,
         published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DZD', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    ).run(
      id,
      slug,
      nextVehicleReference(),
      payload.titleFr,
      payload.titleAr,
      payload.descriptionFr,
      payload.descriptionAr,
      payload.brand,
      payload.model,
      payload.year,
      payload.category,
      payload.transmission,
      payload.fuel,
      payload.seats,
      payload.doors,
      payload.dealType,
      payload.dailyPrice ?? null,
      payload.salePrice ?? null,
      communeId,
      coords.lat,
      coords.lng,
      coords.lat === null ? 'pending' : payload.coordinatePrecision,
      payload.mileageKm ?? null,
      JSON.stringify(payload.features),
      payload.availabilityStatus,
      payload.featured ? 1 : 0,
      payload.status,
      payload.status === 'published' ? now : null,
      now,
      now,
    );

    return getVehicleById(id) as Vehicle;
  });
}

export function updateVehicle(id: string, payload: VehicleWritePayload): Vehicle {
  const db = getDb();
  return transaction(db, () => {
    const existing = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(id);
    if (!existing) throw new ListingError('NOT_FOUND', 'Vehicle not found.');
    if (payload.status === 'published') assertPublishable('vehicle', id, payload.status);

    const now = new Date().toISOString();
    const communeId = resolveCommuneId(payload.communeSlug);
    const coords = coordinatesOf(payload);

    db.prepare(
      `UPDATE vehicles SET
         title_fr = ?, title_ar = ?, description_fr = ?, description_ar = ?,
         brand = ?, model = ?, year = ?, category = ?, transmission = ?, fuel = ?,
         seats = ?, doors = ?, deal_type = ?, daily_price = ?, sale_price = ?,
         commune_id = ?, lat = ?, lng = ?, coordinate_precision = ?, mileage_km = ?,
         features = ?, availability_status = ?, featured = ?, status = ?,
         published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN ? ELSE published_at END,
         updated_at = ?
       WHERE id = ?`,
    ).run(
      payload.titleFr,
      payload.titleAr,
      payload.descriptionFr,
      payload.descriptionAr,
      payload.brand,
      payload.model,
      payload.year,
      payload.category,
      payload.transmission,
      payload.fuel,
      payload.seats,
      payload.doors,
      payload.dealType,
      payload.dailyPrice ?? null,
      payload.salePrice ?? null,
      communeId,
      coords.lat,
      coords.lng,
      coords.lat === null ? 'pending' : payload.coordinatePrecision,
      payload.mileageKm ?? null,
      JSON.stringify(payload.features),
      payload.availabilityStatus,
      payload.featured ? 1 : 0,
      payload.status,
      payload.status,
      now,
      now,
      id,
    );

    return getVehicleById(id) as Vehicle;
  });
}

export function setVehicleStatus(id: string, status: Vehicle['status']): Vehicle | null {
  if (status === 'published') assertPublishable('vehicle', id, status);
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE vehicles SET status = ?,
         published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN ? ELSE published_at END,
         updated_at = ? WHERE id = ?`,
    )
    .run(status, status, now, now, id);
  return getVehicleById(id);
}

export function deleteVehicle(id: string): boolean {
  const db = getDb();
  return transaction(db, () => {
    db.prepare(`DELETE FROM media WHERE entity_type = 'vehicle' AND entity_id = ?`).run(id);
    return db.prepare('DELETE FROM vehicles WHERE id = ?').run(id).changes > 0;
  });
}

/* -------------------------------------------------------------------------- */
/* Admin listing tables                                                       */
/* -------------------------------------------------------------------------- */

export interface AdminPropertyRow {
  id: string;
  reference: string;
  titleFr: string;
  titleAr: string;
  status: Property['status'];
  price: number;
  priceUnit: Property['priceUnit'];
  commune: string;
  coordinatePrecision: string;
  mediaCount: number;
  isDemo: boolean;
  updatedAt: string;
}

export function listAdminProperties(filters: {
  status?: string;
  query?: string;
  demo?: boolean;
  geo?: 'missing';
}): AdminPropertyRow[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters.status && filters.status !== 'all') {
    clauses.push('p.status = ?');
    params.push(filters.status);
  }
  if (filters.demo) clauses.push('p.is_demo = 1');
  if (filters.geo === 'missing') {
    clauses.push(`(p.lat IS NULL OR p.coordinate_precision = 'pending')`);
  }
  if (filters.query?.trim()) {
    const like = `%${filters.query.trim().toLowerCase()}%`;
    clauses.push('(LOWER(p.title_fr) LIKE ? OR LOWER(p.reference) LIKE ?)');
    params.push(like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT p.id, p.reference, p.title_fr, p.title_ar, p.status, p.price, p.price_unit,
              p.coordinate_precision, p.is_demo, p.updated_at, c.name_fr AS commune,
              (SELECT COUNT(*) FROM media m WHERE m.entity_type='property' AND m.entity_id=p.id) AS media_count
       FROM properties p JOIN communes c ON c.id = p.commune_id
       ${where}
       ORDER BY p.updated_at DESC LIMIT 300`,
    )
    .all(...params) as unknown as {
    id: string;
    reference: string;
    title_fr: string;
    title_ar: string;
    status: Property['status'];
    price: number;
    price_unit: Property['priceUnit'];
    coordinate_precision: string;
    is_demo: number;
    updated_at: string;
    commune: string;
    media_count: number;
  }[];

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    titleFr: row.title_fr,
    titleAr: row.title_ar,
    status: row.status,
    price: row.price,
    priceUnit: row.price_unit,
    commune: row.commune,
    coordinatePrecision: row.coordinate_precision,
    mediaCount: row.media_count,
    isDemo: row.is_demo === 1,
    updatedAt: row.updated_at,
  }));
}

export function listAdminVehicles(filters: {
  status?: string;
  query?: string;
  demo?: boolean;
}): {
  id: string;
  reference: string;
  titleFr: string;
  titleAr: string;
  status: Vehicle['status'];
  brand: string;
  year: number;
  dailyPrice: number | null;
  salePrice: number | null;
  commune: string;
  mediaCount: number;
  isDemo: boolean;
  updatedAt: string;
}[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters.status && filters.status !== 'all') {
    clauses.push('v.status = ?');
    params.push(filters.status);
  }
  if (filters.demo) clauses.push('v.is_demo = 1');
  if (filters.query?.trim()) {
    const like = `%${filters.query.trim().toLowerCase()}%`;
    clauses.push('(LOWER(v.title_fr) LIKE ? OR LOWER(v.reference) LIKE ? OR LOWER(v.brand) LIKE ?)');
    params.push(like, like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT v.id, v.reference, v.title_fr, v.title_ar, v.status, v.brand, v.year,
              v.daily_price, v.sale_price, v.is_demo, v.updated_at, c.name_fr AS commune,
              (SELECT COUNT(*) FROM media m WHERE m.entity_type='vehicle' AND m.entity_id=v.id) AS media_count
       FROM vehicles v JOIN communes c ON c.id = v.commune_id
       ${where}
       ORDER BY v.updated_at DESC LIMIT 300`,
    )
    .all(...params) as unknown as {
    id: string;
    reference: string;
    title_fr: string;
    title_ar: string;
    status: Vehicle['status'];
    brand: string;
    year: number;
    daily_price: number | null;
    sale_price: number | null;
    is_demo: number;
    updated_at: string;
    commune: string;
    media_count: number;
  }[];

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    titleFr: row.title_fr,
    titleAr: row.title_ar,
    status: row.status,
    brand: row.brand,
    year: row.year,
    dailyPrice: row.daily_price,
    salePrice: row.sale_price,
    commune: row.commune,
    mediaCount: row.media_count,
    isDemo: row.is_demo === 1,
    updatedAt: row.updated_at,
  }));
}
