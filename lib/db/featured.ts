import '@/lib/server/guard';
import { listFeaturedProperties as listProps } from './properties';
import { listFeaturedVehicles as listVehicles } from './vehicles';

/**
 * Homepage feeds.
 *
 * Featured ordering, but with a hard rule: demonstration rows are never mixed
 * into the public spotlight returned here. If the only content in the database
 * is demo data, the homepage shows its honest empty state rather than presenting
 * fabricated listings as the agency's portfolio.
 */
export function listFeaturedProperties(limit = 6) {
  return listProps(limit).filter((item) => !item.isDemo).slice(0, limit);
}

/**
 * Featured vehicles for the homepage spotlight.
 *
 * `rentalEnabled` is passed through so the repository applies the public
 * projection: with rental off, only sale and saleable `both` rows come back, and
 * a `both` row arrives already presented as a sale.
 */
export function listFeaturedVehicles(
  limit = 3,
  scope: { rentalEnabled?: boolean } = {},
) {
  // Over-fetch slightly: demo rows are filtered out below, so asking for exactly
  // `limit` could leave the spotlight short.
  return listVehicles(limit + 3, scope)
    .filter((item) => !item.isDemo)
    .slice(0, limit);
}
