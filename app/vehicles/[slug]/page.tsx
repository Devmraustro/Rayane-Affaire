import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/shared/public-shell';
import { VehicleDetail } from '@/components/vehicles/vehicle-detail';
import { getVehicleBySlug, listSimilarVehicles } from '@/lib/db/vehicles';
import { getVehicleVisibility } from '@/lib/db/settings';
import { HIDDEN_VEHICLES } from '@/lib/settings';
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
  const visibility = readVisibilitySafely();
  // No public detail page while the section is hidden, and none for a rental-only
  // vehicle while the agency does not rent. Either way the metadata is a generic
  // "not found" — it must not echo the title, brand or reference of a hidden row.
  const vehicle = visibility.publicVisible
    ? getVehicleBySlug(decodeURIComponent(slug), { rentalEnabled: visibility.rentalEnabled })
    : null;

  if (!vehicle) {
    return { title: t.errors.listingNotFoundTitle, robots: { index: false, follow: false } };
  }

  const title = vehicle.title[locale] || vehicle.title.fr;
  const canonical = `${SITE_URL}/vehicles/${encodeURIComponent(vehicle.slug)}`;
  return {
    title,
    description: `${vehicle.brand} ${vehicle.model} ${vehicle.year} — ${vehicle.commune.name[locale]}`,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title,
      url: canonical,
      images: vehicle.media.length ? [{ url: vehicle.media[0].url }] : undefined,
    },
    robots: vehicle.isDemo ? { index: false, follow: false } : undefined,
  };
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const visibility = readVisibilitySafely();
  const rentalEnabled = visibility.rentalEnabled;
  const vehicle = visibility.publicVisible
    ? getVehicleBySlug(decodeURIComponent(slug), { rentalEnabled })
    : null;
  if (!vehicle) notFound();
  const similar = listSimilarVehicles(vehicle, 3, { rentalEnabled });

  return (
    <PublicShell>
      <VehicleDetail vehicle={vehicle} similar={similar} rentalEnabled={rentalEnabled} />
    </PublicShell>
  );
}

/**
 * Reads the policy without letting a database problem break the route.
 * On failure the section is treated as hidden, so a direct URL can only 404.
 */
function readVisibilitySafely() {
  try {
    return getVehicleVisibility();
  } catch {
    return HIDDEN_VEHICLES;
  }
}
