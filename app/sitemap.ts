import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { listProperties } from '@/lib/db/properties';
import { listVehicles } from '@/lib/db/vehicles';
import { defaultPropertyFilters } from '@/lib/db/properties';
import { defaultVehicleFilters } from '@/lib/db/vehicles';
import { isVehicleRentalEnabled } from '@/lib/db/settings';

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
  // With no rental service, neither the vehicle catalogue nor its listings are
  // reachable, so advertising them to crawlers would only produce 404s.
  const rentalEnabled = isVehicleRentalEnabled();
  const paths = ['', '/properties', '/map', '/services', '/about', '/contact', '/credits'];
  if (rentalEnabled) paths.splice(2, 0, '/vehicles');

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
    const vehicles = rentalEnabled
      ? listVehicles({ ...defaultVehicleFilters(), pageSize: 60 }, { includeDemo: false })
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
