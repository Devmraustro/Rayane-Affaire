import '@/lib/server/guard';
import { getDb } from '@/db/client';
import { isVehicleRentalEnabled } from './settings';
import { SAFE_PROJECTION_SQL } from '@/lib/settings';

/**
 * Statistics — ALWAYS derived from the database, never fabricated.
 *
 * Two distinct scopes exist and must not be mixed:
 *   * PUBLIC  — published, non-demonstration records only.
 *   * ADMIN   — the operator's full picture, including drafts and demo rows,
 *               which are reported separately so nobody mistakes them for real
 *               business volume.
 *
 * With an empty database every function returns 0, and the UI renders a
 * professional empty state. There is no seeded "social proof".
 */

export interface PublicStats {
  publishedProperties: number;
  publishedVehicles: number;
  coveredCommunes: number;
  availableNow: number;
  /** True when the catalogue is genuinely empty (drives the empty state). */
  isEmpty: boolean;
}

export function getPublicStats(): PublicStats {
  const db = getDb();

  // Public statistics must not count inventory the catalogue hides — and must
  // count inventory it shows. When rental is off, the vehicle figures still
  // include the sale catalogue (otherwise the site would under-report stock the
  // visitor can actually browse); only rental-only listings drop out.
  const rentalEnabled = isVehicleRentalEnabled();
  // Shared clause: empty when rental is on, `AND (...)` when it is off.
  const visitableVehicles = rentalEnabled ? '' : ` AND ${SAFE_PROJECTION_SQL}`;

  const publishedProperties = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM properties WHERE status = 'published' AND is_demo = 0`)
      .get() as { n: number }
  ).n;
  // Count only what the public can actually reach, and everything it can reach.
  const publishedVehicles = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM vehicles v WHERE v.status = 'published' AND v.is_demo = 0${visitableVehicles}`,
      )
      .get() as { n: number }
  ).n;
  // Only communes that actually have at least one published real listing.
  const coveredCommunes = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT commune_id) AS n FROM (
           SELECT commune_id FROM properties WHERE status = 'published' AND is_demo = 0
           UNION
           SELECT v.commune_id AS commune_id FROM vehicles v WHERE v.status = 'published' AND v.is_demo = 0${visitableVehicles}
         )`,
      )
      .get() as { n: number }
  ).n;
  const availableNow = (
    db
      .prepare(
        `SELECT (
           (SELECT COUNT(*) FROM properties WHERE status = 'published' AND is_demo = 0 AND availability_status = 'available')
         + (SELECT COUNT(*) FROM vehicles v WHERE v.status = 'published' AND v.is_demo = 0 AND v.availability_status = 'available'${visitableVehicles})
         ) AS n`,
      )
      .get() as { n: number }
  ).n;

  return {
    publishedProperties,
    publishedVehicles,
    coveredCommunes,
    availableNow,
    isEmpty: publishedProperties === 0 && publishedVehicles === 0,
  };
}

export interface AdminStats {
  publishedProperties: number;
  draftProperties: number;
  archivedProperties: number;
  demoProperties: number;
  publishedVehicles: number;
  draftVehicles: number;
  demoVehicles: number;
  newInquiries: number;
  totalInquiries: number;
  upcomingReservations: number;
  activeCustomers: number;
  /** Revenue recognised this calendar month (confirmed/active/completed). */
  monthlyRevenue: number;
  totalRevenue: number;
  /** Published demo rows, surfaced so the operator knows what is not real. */
  withoutCoordinates: number;
}

export function getAdminStats(reference = new Date()): AdminStats {
  const db = getDb();
  const n = (sql: string, ...params: (string | number)[]) =>
    (db.prepare(sql).get(...params) as { n: number }).n;

  const monthStart = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1),
  ).toISOString();
  const today = reference.toISOString().slice(0, 10);

  const revenueSince = (since: string | null) =>
    n(
      `SELECT COALESCE(SUM(amount), 0) AS n FROM reservations
       WHERE is_demo = 0 AND status IN ('confirmed','active','completed')
       ${since ? 'AND start_date >= ?' : ''}`,
      ...(since ? [since] : []),
    );

  return {
    publishedProperties: n(`SELECT COUNT(*) AS n FROM properties WHERE status = 'published' AND is_demo = 0`),
    draftProperties: n(`SELECT COUNT(*) AS n FROM properties WHERE status = 'draft' AND is_demo = 0`),
    archivedProperties: n(`SELECT COUNT(*) AS n FROM properties WHERE status = 'archived'`),
    demoProperties: n(`SELECT COUNT(*) AS n FROM properties WHERE is_demo = 1`),
    publishedVehicles: n(`SELECT COUNT(*) AS n FROM vehicles WHERE status = 'published' AND is_demo = 0`),
    draftVehicles: n(`SELECT COUNT(*) AS n FROM vehicles WHERE status = 'draft' AND is_demo = 0`),
    demoVehicles: n(`SELECT COUNT(*) AS n FROM vehicles WHERE is_demo = 1`),
    newInquiries: n(`SELECT COUNT(*) AS n FROM inquiries WHERE status = 'new'`),
    totalInquiries: n(`SELECT COUNT(*) AS n FROM inquiries`),
    upcomingReservations: n(
      `SELECT COUNT(*) AS n FROM reservations WHERE start_date >= ? AND status IN ('pending','confirmed')`,
      today,
    ),
    activeCustomers: n(`SELECT COUNT(*) AS n FROM customers WHERE is_demo = 0`),
    monthlyRevenue: revenueSince(monthStart),
    totalRevenue: revenueSince(null),
    withoutCoordinates: n(
      `SELECT (
         (SELECT COUNT(*) FROM properties WHERE status='published' AND (lat IS NULL OR coordinate_precision='pending'))
       + (SELECT COUNT(*) FROM vehicles   WHERE status='published' AND (lat IS NULL OR coordinate_precision='pending'))
       ) AS n`,
    ),
  };
}

export interface FinanceSummary {
  revenue: number;
  deposits: number;
  reservations: number;
  propertyRevenue: number;
  vehicleRevenue: number;
}

/** Finances, derived from reservations in a closed date range. */
export function getFinanceSummary(from: string, to: string): FinanceSummary {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(amount), 0)                                   AS revenue,
         COALESCE(SUM(deposit), 0)                                  AS deposits,
         COUNT(*)                                                   AS reservations,
         COALESCE(SUM(CASE WHEN kind = 'property' THEN amount ELSE 0 END), 0) AS property_revenue,
         COALESCE(SUM(CASE WHEN kind = 'vehicle'  THEN amount ELSE 0 END), 0) AS vehicle_revenue
       FROM reservations
       WHERE is_demo = 0 AND status IN ('confirmed','active','completed')
         AND start_date >= ? AND start_date <= ?`,
    )
    .get(from, to) as {
    revenue: number;
    deposits: number;
    reservations: number;
    property_revenue: number;
    vehicle_revenue: number;
  };

  return {
    revenue: row.revenue,
    deposits: row.deposits,
    reservations: row.reservations,
    propertyRevenue: row.property_revenue,
    vehicleRevenue: row.vehicle_revenue,
  };
}
