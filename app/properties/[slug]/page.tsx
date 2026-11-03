import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/shared/public-shell';
import { PropertyDetail } from '@/components/properties/property-detail';
import {
  getPropertyBySlug,
  listPropertyMapPoints,
  listSimilarProperties,
  defaultPropertyFilters,
} from '@/lib/db/properties';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE, SITE_URL } from '@/lib/config';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  const property = getPropertyBySlug(decodeURIComponent(slug));

  if (!property) {
    return { title: t.errors.listingNotFoundTitle, robots: { index: false, follow: false } };
  }

  const title = property.title[locale] || property.title.fr;
  const description =
    (property.description[locale] || property.description.fr).slice(0, 160) ||
    `${property.commune.name[locale]} — ${t.properties.title}`;
  const canonical = `${SITE_URL}/properties/${encodeURIComponent(property.slug)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonical,
      images: property.media.length ? [{ url: property.media[0].url }] : undefined,
    },
    // Demonstration records must not be indexed as real inventory.
    robots: property.isDemo ? { index: false, follow: false } : undefined,
  };
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const property = getPropertyBySlug(decodeURIComponent(slug));

  if (!property) notFound();

  // The map point is derived from the same public query used by the map page so
  // a listing can only be shown as a marker when it genuinely qualifies.
  const mapPoints = listPropertyMapPoints({
    ...defaultPropertyFilters(),
    communes: [property.commune.slug],
  });
  const mapPoint = mapPoints.find((point) => point.id === property.id) ?? null;
  const similar = listSimilarProperties(property, 3);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title[locale] || property.title.fr,
    description: property.description[locale] || property.description.fr,
    url: `${SITE_URL}/properties/${encodeURIComponent(property.slug)}`,
    datePosted: property.createdAt,
    ...(property.isDemo ? {} : {}),
    identifier: property.reference,
    image: property.media.map((m) => m.url),
    ...(property.coordinates
      ? {
          contentLocation: {
            '@type': 'Place',
            name: property.commune.name[locale],
            geo: {
              '@type': 'GeoCoordinates',
              latitude: property.coordinates.lat,
              longitude: property.coordinates.lng,
            },
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'DZD',
      availability:
        property.availabilityStatus === 'available'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
    },
  };

  return (
    <PublicShell>
      {/* Structured data is only emitted for real (non-demo) listings. */}
      {!property.isDemo && (
        <script
          type="application/ld+json"
          // JSON.stringify of a plain object we built ourselves; no user HTML.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
        />
      )}
      <PropertyDetail property={property} mapPoint={mapPoint} similar={similar} />
    </PublicShell>
  );
}
