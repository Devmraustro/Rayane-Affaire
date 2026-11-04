import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { listProperties } from '@/lib/db/properties';
import { countPublicSaleVehicles, listVehicles } from '@/lib/db/vehicles';
import { defaultPropertyFilters } from '@/lib/db/properties';
import { defaultVehicleFilters } from '@/lib/db/vehicles';
import { getVehicleVisibility } from '@/lib/db/settings';
import { HIDDEN_VEHICLES } from '@/lib/settings';

/**
 * Sitemap built from the live database — only published, real listings are
 * listed (demonstration rows are excluded from indexing).
 *
 * Rendering is forced to be dynamic: the contents depend on the persisted
 * vehicle-rental setting as well as on the inventory, and a prerendered sitemap
 * would keep advertising a section that an operator has since switched off (or
 * omit one they switched on) until the next deploy.
 */
export const dynamic = 'force-dynamic';
export default function sitemap(): MetadataRoute.Sitemap {
  // The catalogue is advertised only while the section is public. When it is
  // hidden, advertising `/vehicles` would send crawlers to a 404 — and would leak
  // the existence of a section the client asked to hide.
  let visibility = HIDDEN_VEHICLES;
  let saleInventory = 0;
  try {
    visibility = getVehicleVisibility();
    if (visibility.publicVisible) saleInventory = countPublicSaleVehicles(visibility.rentalEnabled);
  } catch {
    // A missing/unmigrated database must not break the sitemap endpoint. The
    // fallback is "hidden", which can only omit URLs, never invent them.
    visibility = HIDDEN_VEHICLES;
  }
  const rentalEnabled = visibility.rentalEnabled;
  const catalogueReachable = visibility.publicVisible && (rentalEnabled || saleInventory > 0);

  const paths = ['', '/properties', '/map', '/services', '/about', '/contact', '/credits'];
  if (catalogueReachable) paths.splice(2, 0, '/vehicles');

  const staticRoutes = paths.map(
    (path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.8,
    }),
  );

  let listings: MetadataRoute.Sitemap = [];
  try {
    const properties = listProperties(
      { ...defaultPropertyFilters(), pageSize: 60 },
      { includeDemo: false },
    );
    // Passing `rentalEnabled` applies the public projection: with rental off this
    // lists sale and saleable `both` rows only, never rental-only ones.
    const vehicles = catalogueReachable
      ? listVehicles(
          { ...defaultVehicleFilters(), pageSize: 60 },
          { includeDemo: false, rentalEnabled },
        )
      : { items: [] as { slug: string; createdAt: string }[] };
    listings = [
      ...properties.items.map((p) => ({
        url: `${SITE_URL}/properties/${encodeURIComponent(p.slug)}`,
        lastModified: p.createdAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...vehicles.items.map((v) => ({
        url: `${SITE_URL}/vehicles/${encodeURIComponent(v.slug)}`,
        lastModified: v.createdAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // A missing/unmigrated database must not break the sitemap endpoint.
    listings = [];
  }

  return [...staticRoutes, ...listings];
}
