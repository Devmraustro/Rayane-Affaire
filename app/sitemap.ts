import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { listProperties } from '@/lib/db/properties';
import { listVehicles } from '@/lib/db/vehicles';
import { defaultPropertyFilters } from '@/lib/db/properties';
import { defaultVehicleFilters } from '@/lib/db/vehicles';

/**
 * Sitemap built from the live database — only published, real listings are
 * listed (demonstration rows are excluded from indexing).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/properties', '/vehicles', '/map', '/services', '/about', '/contact'].map(
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
    const vehicles = listVehicles({ ...defaultVehicleFilters(), pageSize: 60 }, { includeDemo: false });
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
