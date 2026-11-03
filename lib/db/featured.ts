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

export function listFeaturedVehicles(limit = 3) {
  return listVehicles(limit).filter((item) => !item.isDemo).slice(0, limit);
}
