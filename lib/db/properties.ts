import '@/lib/server/guard';
import { getDb } from '@/db/client';
import {
  rowToMedia,
  rowToProperty,
  rowToPropertySummary,
  type CommuneRow,
  type MediaRow,
  type PropertyRow,
} from './mappers';
import type {
  Paginated,
  Property,
  PropertyFilters,
  PropertyMapPoint,
  PropertySummary,
} from '@/types';

/**
 * Property repository.
 *
 * All public reads are scoped to `status = 'published'` by an explicit flag, so
 * a forgotten filter can never leak a draft. Demonstration rows are included
 * only when the caller asks for them (public catalogues include them *labelled*;
 * statistics never do).
 */

const PUBLIC_WHERE = `p.status = 'published'`;

export interface PublicScope {
  /** Include `is_demo` rows. Catalogues: true (they are labelled). Stats: false. */
  includeDemo?: boolean;
}

function demoSql(includeDemo: boolean | undefined): string {
  return includeDemo === false ? ' AND p.is_demo = 0' : '';
}

/* -------------------------------------------------------------------------- */
/* Filtering                                                                  */
/* -------------------------------------------------------------------------- */

/** Re-exported so server callers keep a single import site (see lib/filters.ts). */
export { defaultPropertyFilters } from '@/lib/filters';

interface WhereClause {
  sql: string;
  params: (string | number)[];
}

export function buildPropertyWhere(filters: PropertyFilters, scope: PublicScope = {}): WhereClause {
  const clauses: string[] = [PUBLIC_WHERE];
  const params: (string | number)[] = [];

  if (scope.includeDemo === false) clauses.push('p.is_demo = 0');

  if (filters.query.trim()) {
    const like = `%${filters.query.trim().toLowerCase()}%`;
    clauses.push(
      `(LOWER(p.title_fr) LIKE ? OR LOWER(p.title_ar) LIKE ? OR LOWER(p.reference) LIKE ?
        OR LOWER(p.description_fr) LIKE ? OR LOWER(p.description_ar) LIKE ?
        OR LOWER(p.address_fr) LIKE ? OR LOWER(c.name_fr) LIKE ? OR LOWER(c.name_ar) LIKE ?)`,
    );
    params.push(like, like, like, like, like, like, like, like);
  }
  if (filters.communes.length) {
    clauses.push(`c.slug IN (${filters.communes.map(() => '?').join(',')})`);
    params.push(...filters.communes);
  }
  if (filters.categories.length) {
    clauses.push(`p.category IN (${filters.categories.map(() => '?').join(',')})`);
    params.push(...filters.categories);
  }
  if (filters.transactions.length) {
    clauses.push(`p.transaction_type IN (${filters.transactions.map(() => '?').join(',')})`);
    params.push(...filters.transactions);
  }
  if (filters.minPrice !== null) {
    clauses.push('p.price >= ?');
    params.push(filters.minPrice);
  }
  if (filters.maxPrice !== null) {
    clauses.push('p.price <= ?');
    params.push(filters.maxPrice);
  }
  if (filters.bedrooms !== null) {
    clauses.push('p.bedrooms >= ?');
    params.push(filters.bedrooms);
  }
  if (filters.surfaceMin !== null) {
    clauses.push('p.surface >= ?');
    params.push(filters.surfaceMin);
  }
  if (filters.furnishing !== 'all') {
    clauses.push('p.furnishing = ?');
    params.push(filters.furnishing);
  }
  if (filters.availableOnly) clauses.push(`p.availability_status = 'available'`);
  if (filters.withCoordinatesOnly) {
    clauses.push('p.lat IS NOT NULL AND p.lng IS NOT NULL AND p.coordinate_precision <> \'pending\'');
  }

  return { sql: clauses.join(' AND '), params };
}

const SORT_SQL: Record<PropertyFilters['sort'], string> = {
  newest: 'p.published_at DESC, p.created_at DESC',
  'price-asc': 'p.price ASC',
  'price-desc': 'p.price DESC',
  'surface-desc': 'p.surface DESC',
  relevance: 'p.featured DESC, p.published_at DESC',
};

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

function thumbnailsFor(ids: string[]): Map<string, MediaRow> {
  if (!ids.length) return new Map();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM media
       WHERE entity_type = 'property'
         AND entity_id IN (${ids.map(() => '?').join(',')})
       ORDER BY sort_order ASC`,
    )
    .all(...ids) as unknown as MediaRow[];
  const map = new Map<string, MediaRow>();
  for (const row of rows) if (!map.has(row.entity_id)) map.set(row.entity_id, row);
  return map;
}

export function listProperties(
  filters: PropertyFilters,
  scope: PublicScope = {},
): Paginated<PropertySummary> {
  const db = getDb();
  const where = buildPropertyWhere(filters, scope);
  const total = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM properties p JOIN communes c ON c.id = p.commune_id WHERE ${where.sql}`)
      .get(...where.params) as { n: number }
  ).n;

  const page = Math.max(1, filters.page);
  const pageSize = Math.min(60, Math.max(1, filters.pageSize));
  const offset = (page - 1) * pageSize;

  const rows = db
    .prepare(
      `SELECT p.*, c.id AS c_id, c.slug AS c_slug, c.name_fr AS c_name_fr, c.name_ar AS c_name_ar
       FROM properties p
       JOIN communes c ON c.id = p.commune_id
       WHERE ${where.sql}
       ORDER BY ${SORT_SQL[filters.sort] ?? SORT_SQL.newest}
       LIMIT ? OFFSET ?`,
    )
    .all(...where.params, pageSize, offset) as unknown as (PropertyRow & {
    c_id: string;
    c_slug: string;
    c_name_fr: string;
    c_name_ar: string;
  })[];

  const thumbs = thumbnailsFor(rows.map((r) => r.id));

  const items = rows.map((row) => {
    const thumbRow = thumbs.get(row.id);
    return rowToPropertySummary(
      row,
      {
        id: row.c_id,
        slug: row.c_slug,
        name: { fr: row.c_name_fr, ar: row.c_name_ar },
      },
      thumbRow ? rowToMedia(thumbRow) : null,
    );
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function getPropertyBySlug(slug: string, scope: PublicScope = {}): Property | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT p.* FROM properties p
       WHERE p.slug = ? AND p.status = 'published'${demoSql(scope.includeDemo)}`,
    )
    .get(slug) as PropertyRow | undefined;
  if (!row) return null;
  const commune = db.prepare('SELECT * FROM communes WHERE id = ?').get(row.commune_id) as
    | CommuneRow
    | undefined;
  const media = (
    db
      .prepare(
        `SELECT * FROM media WHERE entity_type = 'property' AND entity_id = ?
         ORDER BY sort_order ASC`,
      )
      .all(row.id) as unknown as MediaRow[]
  ).map(rowToMedia);
  return rowToProperty(row, commune, media);
}

/** Admin read: any status, any demo flag. */
export function getPropertyById(id: string): Property | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as
    | PropertyRow
    | undefined;
  if (!row) return null;
  const commune = db.prepare('SELECT * FROM communes WHERE id = ?').get(row.commune_id) as
    | CommuneRow
    | undefined;
  const media = (
    db
      .prepare(
        `SELECT * FROM media WHERE entity_type = 'property' AND entity_id = ?
         ORDER BY sort_order ASC`,
      )
      .all(row.id) as unknown as MediaRow[]
  ).map(rowToMedia);
  return rowToProperty(row, commune, media);
}

export function listSimilarProperties(
  property: Property,
  limit = 3,
): PropertySummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, c.id AS c_id, c.slug AS c_slug, c.name_fr AS c_name_fr, c.name_ar AS c_name_ar
       FROM properties p JOIN communes c ON c.id = p.commune_id
       WHERE p.status = 'published' AND p.id <> ?
         AND (p.category = ? OR p.commune_id = ?)
       ORDER BY (p.category = ?) DESC, ABS(p.price - ?) ASC
       LIMIT ?`,
    )
    .all(
      property.id,
      property.category,
      property.commune.id,
      property.category,
      property.price,
      limit,
    ) as unknown as (PropertyRow & {
    c_id: string;
    c_slug: string;
    c_name_fr: string;
    c_name_ar: string;
  })[];
  const thumbs = thumbnailsFor(rows.map((r) => r.id));
  return rows.map((row) => {
    const thumbRow = thumbs.get(row.id);
    return rowToPropertySummary(
      row,
      { id: row.c_id, slug: row.c_slug, name: { fr: row.c_name_fr, ar: row.c_name_ar } },
      thumbRow ? rowToMedia(thumbRow) : null,
    );
  });
}

export function listFeaturedProperties(limit = 6): PropertySummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, c.id AS c_id, c.slug AS c_slug, c.name_fr AS c_name_fr, c.name_ar AS c_name_ar
       FROM properties p JOIN communes c ON c.id = p.commune_id
       WHERE p.status = 'published'
       ORDER BY p.featured DESC, p.published_at DESC, p.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as unknown as (PropertyRow & {
    c_id: string;
    c_slug: string;
    c_name_fr: string;
    c_name_ar: string;
  })[];
  const thumbs = thumbnailsFor(rows.map((r) => r.id));
  return rows.map((row) => {
    const thumbRow = thumbs.get(row.id);
    return rowToPropertySummary(
      row,
      { id: row.c_id, slug: row.c_slug, name: { fr: row.c_name_fr, ar: row.c_name_ar } },
      thumbRow ? rowToMedia(thumbRow) : null,
    );
  });
}

/**
 * Map points.
 *
 * A listing appears on the map only when it has coordinates AND its precision
 * is not `pending`. Nothing is placed "at the commune centre to fill the map":
 * a listing whose position is unknown simply is not a point.
 */
export function listPropertyMapPoints(
  filters: PropertyFilters,
  scope: PublicScope = {},
): PropertyMapPoint[] {
  const db = getDb();
  const scoped: PropertyFilters = {
    ...filters,
    withCoordinatesOnly: true,
    pageSize: 500,
    page: 1,
  };
  const where = buildPropertyWhere(scoped, scope);
  const rows = db
    .prepare(
      `SELECT p.id, p.slug, p.reference, p.title_fr, p.title_ar, p.price, p.price_unit,
              p.transaction_type, p.category, p.coordinate_precision, p.lat, p.lng,
              c.slug AS c_slug, c.name_fr AS c_name_fr, c.name_ar AS c_name_ar
       FROM properties p JOIN communes c ON c.id = p.commune_id
       WHERE ${where.sql}
       ORDER BY p.featured DESC, p.published_at DESC
       LIMIT 500`,
    )
    .all(...where.params) as unknown as {
    id: string;
    slug: string;
    reference: string;
    title_fr: string;
    title_ar: string;
    price: number;
    price_unit: PropertyMapPoint['priceUnit'];
    transaction_type: PropertyMapPoint['transaction'];
    category: PropertyMapPoint['category'];
    coordinate_precision: PropertyMapPoint['coordinatePrecision'];
    lat: number;
    lng: number;
    c_slug: string;
    c_name_fr: string;
    c_name_ar: string;
  }[];

  const thumbs = thumbnailsFor(rows.map((r) => r.id));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    reference: row.reference,
    title: { fr: row.title_fr, ar: row.title_ar },
    price: row.price,
    priceUnit: row.price_unit,
    transaction: row.transaction_type,
    category: row.category,
    coordinatePrecision: row.coordinate_precision,
    commune: { slug: row.c_slug, name: { fr: row.c_name_fr, ar: row.c_name_ar } },
    thumbnailUrl: thumbs.get(row.id)?.url ?? null,
    lat: row.lat,
    lng: row.lng,
  }));
}

/** Count of published listings that cannot be placed on the map yet. */
export function countPublishedWithoutCoordinates(): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM properties
       WHERE status = 'published' AND (lat IS NULL OR lng IS NULL OR coordinate_precision = 'pending')`,
    )
    .get() as { n: number };
  return row.n;
}
