import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/shared/public-shell';
import { VehicleDetail } from '@/components/vehicles/vehicle-detail';
import { getVehicleBySlug, listSimilarVehicles } from '@/lib/db/vehicles';
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
  const vehicle = getVehicleBySlug(decodeURIComponent(slug));

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
  const vehicle = getVehicleBySlug(decodeURIComponent(slug));
  if (!vehicle) notFound();
  const similar = listSimilarVehicles(vehicle, 3);

  return (
    <PublicShell>
      <VehicleDetail vehicle={vehicle} similar={similar} />
    </PublicShell>
  );
}
