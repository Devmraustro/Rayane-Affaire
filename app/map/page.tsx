import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/shared/public-shell';
import { MapExplorer } from '@/components/map/map-explorer';
import { listPropertyMapPoints, countPublishedWithoutCoordinates, defaultPropertyFilters } from '@/lib/db/properties';
import { listCommunes } from '@/lib/db/communes';
import { parsePropertySearchParams } from '@/lib/filters';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  return { title: t.map.title, description: t.map.subtitle, alternates: { canonical: '/map' } };
}

export default async function MapPage({ searchParams }: PageProps) {
  const filters = parsePropertySearchParams(await searchParams);
  const communes = listCommunes({ activeOnly: true });
  // Only listings with verified (non-pending) coordinates become map points.
  const points = listPropertyMapPoints({ ...defaultPropertyFilters(), ...filters, withCoordinatesOnly: true });
  const hiddenCount = countPublishedWithoutCoordinates();
  const selectedCommune = filters.communes[0] ?? '';

  return (
    <PublicShell>
      <MapExplorer
        points={points}
        communes={communes}
        selectedCommune={selectedCommune}
        hiddenCount={hiddenCount}
      />
    </PublicShell>
  );
}
