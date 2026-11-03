import '@/lib/server/guard';
import { getDb } from '@/db/client';
import {
  rowToCommune,
  rowToMedia,
  type CommuneRow,
  type MediaRow,
  type VehicleRow,
} from './mappers';
import type { Paginated, Vehicle, VehicleFilters, VehicleSummary } from '@/types';

/** Vehicle repository — mirrors `lib/db/properties.ts` semantics. */

/** Re-exported so server callers keep a single import site (see lib/filters.ts). */
export { defaultVehicleFilters } from '@/lib/filters';

interface WhereClause {
  sql: string;
  params: (string | number)[];
}

export function buildVehicleWhere(
  filters: VehicleFilters,
  scope: { includeDemo?: boolean } = {},
): WhereClause {
  const clauses: string[] = [`v.status = 'published'`];
  const params: (string | number)[] = [];

  if (scope.includeDemo === false) clauses.push('v.is_demo = 0');

  if (filters.query.trim()) {
    const like = `%${filters.query.trim().toLowerCase()}%`;
    clauses.push(
      `(LOWER(v.title_fr) LIKE ? OR LOWER(v.title_ar) LIKE ? OR LOWER(v.brand) LIKE ?
        OR LOWER(v.model) LIKE ? OR LOWER(v.reference) LIKE ? OR LOWER(c.name_fr) LIKE ?)`,
    );
    params.push(like, like, like, like, like, like);
  }
  if (filters.communes.length) {
    clauses.push(`c.slug IN (${filters.communes.map(() => '?').join(',')})`);
    params.push(...filters.communes);
  }
  if (filters.categories.length) {
    clauses.push(`v.category IN (${filters.categories.map(() => '?').join(',')})`);
    params.push(...filters.categories);
  }
  if (filters.dealTypes.length) {
    // `both` satisfies a `rent` or `sale` filter.
    const parts = filters.dealTypes.map(() => 'v.deal_type IN (?, \'both\')');
    clauses.push(`(${parts.join(' OR ')})`);
    for (const d of filters.dealTypes) params.push(d);
  }
  if (filters.minPrice !== null) {
    clauses.push('COALESCE(v.daily_price, v.sale_price, 0) >= ?');
    params.push(filters.minPrice);
  }
  if (filters.maxPrice !== null) {
    clauses.push('COALESCE(v.daily_price, v.sale_price, 0) <= ?');
    params.push(filters.maxPrice);
  }
  if (filters.transmission !== 'all') {
    clauses.push('v.transmission = ?');
    params.push(filters.transmission);
  }
  if (filters.fuel !== 'all') {
    clauses.push('v.fuel = ?');
    params.push(filters.fuel);
  }
  if (filters.seats !== null) {
    clauses.push('v.seats >= ?');
    params.push(filters.seats);
  }
  if (filters.availableOnly) clauses.push(`v.availability_status = 'available'`);

  return { sql: clauses.join(' AND '), params };
}

const SORT_SQL: Record<VehicleFilters['sort'], string> = {
  newest: 'v.published_at DESC, v.created_at DESC',
  'price-asc': 'COALESCE(v.daily_price, v.sale_price, 0) ASC',
  'price-desc': 'COALESCE(v.daily_price, v.sale_price, 0) DESC',
  'year-desc': 'v.year DESC',
  relevance: 'v.featured DESC, v.published_at DESC',
};

function thumbnailsFor(ids: string[]): Map<string, MediaRow> {
  if (!ids.length) return new Map();
  const rows = getDb()
    .prepare(
      `SELECT * FROM media WHERE entity_type = 'vehicle'
         AND entity_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order ASC`,
    )
    .all(...ids) as unknown as MediaRow[];
  const map = new Map<string, MediaRow>();
  for (const row of rows) if (!map.has(row.entity_id)) map.set(row.entity_id, row);
  return map;
}

type VehicleJoinedRow = VehicleRow & {
  c_id: string;
  c_slug: string;
  c_name_fr: string;
  c_name_ar: string;
};

function toSummary(row: VehicleJoinedRow, thumb: MediaRow | undefined): VehicleSummary {
  return {
    id: row.id,
    slug: row.slug,
    reference: row.reference,
    title: { fr: row.title_fr, ar: row.title_ar },
    brand: row.brand,
    model: row.model,
    year: row.year,
    category: row.category as VehicleSummary['category'],
    transmission: row.transmission as VehicleSummary['transmission'],
    fuel: row.fuel as VehicleSummary['fuel'],
    seats: row.seats,
    dealType: row.deal_type as VehicleSummary['dealType'],
    dailyPrice: row.daily_price,
    salePrice: row.sale_price,
    currency: 'DZD',
    isDemo: row.is_demo === 1,
    commune: {
      id: row.c_id,
      slug: row.c_slug,
      name: { fr: row.c_name_fr, ar: row.c_name_ar },
    },
    availabilityStatus: row.availability_status as VehicleSummary['availabilityStatus'],
    featured: row.featured === 1,
    thumbnail: thumb ? rowToMedia(thumb) : null,
    createdAt: row.created_at,
  };
}

export function listVehicles(
  filters: VehicleFilters,
  scope: { includeDemo?: boolean } = {},
): Paginated<VehicleSummary> {
  const db = getDb();
  const where = buildVehicleWhere(filters, scope);
  const total = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM vehicles v JOIN communes c ON c.id = v.commune_id WHERE ${where.sql}`,
      )
      .get(...where.params) as { n: number }
  ).n;

  const page = Math.max(1, filters.page);
  const pageSize = Math.min(60, Math.max(1, filters.pageSize));
  const rows = db
    .prepare(
      `SELECT v.*, c.id AS c_id, c.slug AS c_slug, c.name_fr AS c_name_fr, c.name_ar AS c_name_ar
       FROM vehicles v JOIN communes c ON c.id = v.commune_id
       WHERE ${where.sql}
       ORDER BY ${SORT_SQL[filters.sort] ?? SORT_SQL.newest}
       LIMIT ? OFFSET ?`,
    )
    .all(...where.params, pageSize, (page - 1) * pageSize) as unknown as VehicleJoinedRow[];

  const thumbs = thumbnailsFor(rows.map((r) => r.id));
  return {
    items: rows.map((row) => toSummary(row, thumbs.get(row.id))),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function hydrate(row: VehicleRow): Vehicle | null {
  const db = getDb();
  const commune = db.prepare('SELECT * FROM communes WHERE id = ?').get(row.commune_id) as
    | CommuneRow
    | undefined;
  if (!commune) return null;
  const media = (
    db
      .prepare(
        `SELECT * FROM media WHERE entity_type = 'vehicle' AND entity_id = ?
         ORDER BY sort_order ASC`,
      )
      .all(row.id) as unknown as MediaRow[]
  ).map(rowToMedia);
  return {
    id: row.id,
    slug: row.slug,
    reference: row.reference,
    title: { fr: row.title_fr, ar: row.title_ar },
    description: { fr: row.description_fr, ar: row.description_ar },
    brand: row.brand,
    model: row.model,
    year: row.year,
    category: row.category as Vehicle['category'],
    transmission: row.transmission as Vehicle['transmission'],
    fuel: row.fuel as Vehicle['fuel'],
    seats: row.seats,
    doors: row.doors,
    dealType: row.deal_type as Vehicle['dealType'],
    dailyPrice: row.daily_price,
    salePrice: row.sale_price,
    currency: 'DZD',
    isDemo: row.is_demo === 1,
    registrationYearVerified: true,
    commune: rowToCommune(commune),
    coordinates: row.lat === null || row.lng === null ? null : { lat: row.lat, lng: row.lng },
    coordinatePrecision: row.coordinate_precision as Vehicle['coordinatePrecision'],
    mileageKm: row.mileage_km,
    features: ((): string[] => {
      try {
        const parsed: unknown = JSON.parse(row.features);
        return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
      } catch {
        return [];
      }
    })(),
    availabilityStatus: row.availability_status as Vehicle['availabilityStatus'],
    featured: row.featured === 1,
    status: row.status as Vehicle['status'],
    media,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getVehicleBySlug(slug: string, scope: { includeDemo?: boolean } = {}): Vehicle | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM vehicles WHERE slug = ? AND status = 'published'${
        scope.includeDemo === false ? ' AND is_demo = 0' : ''
      }`,
    )
    .get(slug) as VehicleRow | undefined;
  return row ? hydrate(row) : null;
}

export function getVehicleById(id: string): Vehicle | null {
  const row = getDb().prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as
    | VehicleRow
    | undefined;
  return row ? hydrate(row) : null;
}

export function listFeaturedVehicles(limit = 3): VehicleSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT v.*, c.id AS c_id, c.slug AS c_slug, c.name_fr AS c_name_fr, c.name_ar AS c_name_ar
       FROM vehicles v JOIN communes c ON c.id = v.commune_id
       WHERE v.status = 'published'
       ORDER BY v.featured DESC, v.published_at DESC, v.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as unknown as VehicleJoinedRow[];
  const thumbs = thumbnailsFor(rows.map((r) => r.id));
  return rows.map((row) => toSummary(row, thumbs.get(row.id)));
}

export function listSimilarVehicles(vehicle: Vehicle, limit = 3): VehicleSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT v.*, c.id AS c_id, c.slug AS c_slug, c.name_fr AS c_name_fr, c.name_ar AS c_name_ar
       FROM vehicles v JOIN communes c ON c.id = v.commune_id
       WHERE v.status = 'published' AND v.id <> ?
       ORDER BY (v.category = ?) DESC, ABS(COALESCE(v.daily_price, v.sale_price, 0) - ?) ASC
       LIMIT ?`,
    )
    .all(
      vehicle.id,
      vehicle.category,
      vehicle.dailyPrice ?? vehicle.salePrice ?? 0,
      limit,
    ) as unknown as VehicleJoinedRow[];
  const thumbs = thumbnailsFor(rows.map((r) => r.id));
  return rows.map((row) => toSummary(row, thumbs.get(row.id)));
}
