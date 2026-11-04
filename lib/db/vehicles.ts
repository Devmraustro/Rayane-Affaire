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
import { getVehicleVisibility, isVehiclePublicVisible } from './settings';
import { SAFE_PROJECTION_SQL, projectVehicleForPublic, type VehicleVisibility } from '@/lib/settings';

/**
 * Vehicle repository — mirrors `lib/db/properties.ts` semantics.
 *
 * Rental visibility: when the agency has no rental service (own fleet or
 * partner), every reader that serves the *public* surface takes `rentalEnabled`
 * and drops rental-only listings. Sale inventory stays fully discoverable —
 * catalogue, navigation, homepage spotlight, statistics and sitemap — because
 * hiding rental must not hide sales.
 *
 * A `both` listing is treated as what it is: a sale listing that also offered
 * rental. With rental off it survives as a sale listing and its rental price is
 * withheld through `projectVehicleForPublic`. That is a *projection*: no row is
 * updated, so flipping the setting back restores the original presentation
 * exactly.
 *
 * The master switch lives in `getVehicleVisibility()`. When the section is
 * hidden, every PUBLIC reader below returns nothing at all — an empty page for
 * listings, `null` for a detail lookup — so a forgotten `rentalEnabled={false}`
 * at a call site cannot leak inventory.
 *
 * Admin readers (see `lib/db/admin-listings.ts`) query the table directly and are
 * unaffected, so an operator keeps working with the full inventory.
 */

/** Re-exported so server callers keep a single import site (see lib/filters.ts). */
export { defaultVehicleFilters } from '@/lib/filters';

interface WhereClause {
  sql: string;
  params: (string | number)[];
}

/**
 * Resolves the effective policy for a public reader, letting a test or an
 * explicit call override it without going through the database.
 */
function resolveScope(scope: {
  rentalEnabled?: boolean;
  publicVisible?: boolean;
}): VehicleVisibility {
  if (scope.publicVisible !== undefined) {
    return { publicVisible: scope.publicVisible, rentalEnabled: scope.rentalEnabled ?? true };
  }
  const visibility = getVehicleVisibility();
  return scope.rentalEnabled === undefined
    ? visibility
    : { ...visibility, rentalEnabled: scope.rentalEnabled && visibility.publicVisible };
}

/**
 * `AND`-prefixed form of the public projection, for query strings that already
 * have a `WHERE` clause. The bare form is used as its own where-clause in
 * `buildVehicleWhere`.
 */
function withProjection(rentalEnabled: boolean): string {
  return rentalEnabled ? '' : ` AND ${SAFE_PROJECTION_SQL}`;
}

export function buildVehicleWhere(
  filters: VehicleFilters,
  scope: { includeDemo?: boolean; rentalEnabled?: boolean; publicVisible?: boolean } = {},
): WhereClause {
  // A hidden section exposes no listing at all. `0` is a valid SQLite predicate
  // and makes the intent unmistakable in a query log.
  if (scope.publicVisible === false) return { sql: '0', params: [] };

  const clauses: string[] = [`v.status = 'published'`];
  const params: (string | number)[] = [];

  if (scope.includeDemo === false) clauses.push('v.is_demo = 0');

  // Rental switched off ⇒ drop rental-only listings but keep every sale listing,
  // including `both` rows that still carry a sale price. See SAFE_PROJECTION_SQL.
  if (scope.rentalEnabled === false) clauses.push(SAFE_PROJECTION_SQL);

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

/**
 * Builds the public summary from a row plus its public projection.
 *
 * The projection is applied *before* the prices are copied, so a `both` listing
 * presented as a sale cannot fall back to showing a per-day price: `VehicleCard`
 * keys its price label off `dealType`.
 */
function toSummary(
  row: VehicleJoinedRow,
  thumb: MediaRow | undefined,
  rentalEnabled: boolean,
): VehicleSummary {
  const view = projectVehicleForPublic(
    { dealType: row.deal_type, dailyPrice: row.daily_price, salePrice: row.sale_price },
    rentalEnabled,
  );
  const dealType = view.dealType as VehicleSummary['dealType'];
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
    dealType,
    dailyPrice: view.dailyPrice,
    salePrice: view.salePrice,
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
  scope: { includeDemo?: boolean; rentalEnabled?: boolean; publicVisible?: boolean } = {},
): Paginated<VehicleSummary> {
  const db = getDb();
  // Default to the persisted policy so no caller can accidentally widen the
  // public surface by forgetting to pass it.
  const visibility = resolveScope(scope);
  const rentalEnabled = visibility.rentalEnabled;
  // Hidden section ⇒ nothing to serve, and no query to run either.
  if (!visibility.publicVisible) {
    return { items: [], total: 0, page: 1, pageSize: filters.pageSize, totalPages: 1 };
  }
  const where = buildVehicleWhere(filters, { ...scope, rentalEnabled });
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
    items: rows.map((row) => toSummary(row, thumbs.get(row.id), rentalEnabled)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function hydrate(row: VehicleRow, rentalEnabled: boolean): Vehicle | null {
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
  // Same projection as the list view: a `both` listing shown as a sale must not
  // print a rental price, and the badge must say "à vendre".
  const view = projectVehicleForPublic(
    { dealType: row.deal_type, dailyPrice: row.daily_price, salePrice: row.sale_price },
    rentalEnabled,
  );
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
    dealType: view.dealType as Vehicle['dealType'],
    dailyPrice: view.dailyPrice,
    salePrice: view.salePrice,
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

export function getVehicleBySlug(
  slug: string,
  scope: { includeDemo?: boolean; rentalEnabled?: boolean; publicVisible?: boolean } = {},
): Vehicle | null {
  const visibility = resolveScope(scope);
  // A hidden section has no public detail page at all — the route turns this null
  // into a 404, so a direct URL exposes nothing.
  if (!visibility.publicVisible) return null;
  const rentalEnabled = visibility.rentalEnabled;
  // Rental off ⇒ a rental-only listing has no public page (404). A `both` listing
  // stays reachable as a sale listing, with its rental price projected away.
  const rentalClause = rentalEnabled
    ? ''
    : ` AND (deal_type IN ('sale','both') AND sale_price IS NOT NULL)`;
  const row = getDb()
    .prepare(
      `SELECT * FROM vehicles AS v WHERE slug = ? AND status = 'published'${
        scope.includeDemo === false ? ' AND is_demo = 0' : ''
      }${rentalClause}`,
    )
    .get(slug) as VehicleRow | undefined;
  return row ? hydrate(row, rentalEnabled) : null;
}

/**
 * Admin read: the full, unprojected record.
 *
 * `rentalEnabled: true` is not a public-visibility decision here — it disables the
 * projection so the operator always sees the real deal type and both prices.
 */
export function getVehicleById(id: string): Vehicle | null {
  const row = getDb().prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as
    | VehicleRow
    | undefined;
  return row ? hydrate(row, true) : null;
}

export function listFeaturedVehicles(
  limit = 3,
  scope: { rentalEnabled?: boolean; publicVisible?: boolean } = {},
): VehicleSummary[] {
  const db = getDb();
  const visibility = resolveScope(scope);
  if (!visibility.publicVisible) return [];
  const rentalEnabled = visibility.rentalEnabled;
  const rows = db
    .prepare(
      `SELECT v.*, c.id AS c_id, c.slug AS c_slug, c.name_fr AS c_name_fr, c.name_ar AS c_name_ar
       FROM vehicles v JOIN communes c ON c.id = v.commune_id
       WHERE v.status = 'published'${withProjection(rentalEnabled)}
       ORDER BY v.featured DESC, v.published_at DESC, v.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as unknown as VehicleJoinedRow[];
  const thumbs = thumbnailsFor(rows.map((r) => r.id));
  return rows.map((row) => toSummary(row, thumbs.get(row.id), rentalEnabled));
}

export function listSimilarVehicles(
  vehicle: Vehicle,
  limit = 3,
  scope: { rentalEnabled?: boolean; publicVisible?: boolean } = {},
): VehicleSummary[] {
  const db = getDb();
  const visibility = resolveScope(scope);
  if (!visibility.publicVisible) return [];
  const rentalEnabled = visibility.rentalEnabled;
  const rows = db
    .prepare(
      `SELECT v.*, c.id AS c_id, c.slug AS c_slug, c.name_fr AS c_name_fr, c.name_ar AS c_name_ar
       FROM vehicles v JOIN communes c ON c.id = v.commune_id
       WHERE v.status = 'published' AND v.id <> ?${withProjection(rentalEnabled)}
       ORDER BY (v.category = ?) DESC, ABS(COALESCE(v.sale_price, v.daily_price, 0) - ?) ASC
       LIMIT ?`,
    )
    .all(
      vehicle.id,
      vehicle.category,
      vehicle.salePrice ?? vehicle.dailyPrice ?? 0,
      limit,
    ) as unknown as VehicleJoinedRow[];
  const thumbs = thumbnailsFor(rows.map((r) => r.id));
  return rows.map((row) => toSummary(row, thumbs.get(row.id), rentalEnabled));
}

/**
 * How many published sale vehicles the public can reach.
 *
 * Navigation needs this to decide whether a "for sale" link leads anywhere: with
 * rental off and no sale inventory the entry would open an empty catalogue, which
 * is worse than no entry at all. Real (non-demonstration) rows only — a link to
 * demonstration stock would advertise inventory the agency does not have.
 *
 * Takes the flag as an argument so callers that already read it do not pay for a
 * second settings lookup, and so tests can drive both states explicitly.
 */
export function countPublicSaleVehicles(rentalEnabled: boolean): number {
  // The count backs navigation, the hero CTA and the sitemap — all public. A
  // hidden section has zero public sale inventory by definition.
  if (!isVehiclePublicVisible()) return 0;
  const clause = withProjection(rentalEnabled);
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM vehicles v
       WHERE v.status = 'published' AND v.is_demo = 0${clause}`,
    )
    .get() as { n: number };
  return row.n;
}
