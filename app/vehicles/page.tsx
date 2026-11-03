import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Car } from 'lucide-react';
import { PublicShell } from '@/components/shared/public-shell';
import { VehicleCard } from '@/components/vehicles/vehicle-card';
import { VehicleFiltersPanel } from '@/components/vehicles/vehicle-filters';
import { Pagination } from '@/components/shared/pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { listVehicles } from '@/lib/db/vehicles';
import { listCommunes } from '@/lib/db/communes';
import { isVehicleRentalEnabled } from '@/lib/db/settings';
import { parseVehicleSearchParams, toVehicleQuery } from '@/lib/filters';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { formatNumber } from '@/lib/format';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  const rentalEnabled = isVehicleRentalEnabled();
  return {
    // With rental off, the catalogue is a sale catalogue, so the metadata and the
    // index/nofollow decision follow the actual content instead of the old copy.
    title: rentalEnabled ? t.vehicles.title : t.vehicles.titleSaleOnly,
    description: rentalEnabled ? t.vehicles.subtitle : t.vehicles.subtitleSaleOnly,
    alternates: { canonical: '/vehicles' },
    robots: rentalEnabled ? undefined : { index: true, follow: true },
  };
}

export default async function VehiclesPage({ searchParams }: PageProps) {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const filters = parseVehicleSearchParams(await searchParams);
  const communes = listCommunes({ activeOnly: true });
  const rentalEnabled = isVehicleRentalEnabled();
  // `listVehicles` already excludes rentable listings when the flag is off; the
  // explicit pass keeps the intent visible at the call site.
  const results = listVehicles(filters, { rentalEnabled });

  const buildHref = (page: number) => {
    const query = toVehicleQuery({ ...filters, page });
    return query ? `/vehicles?${query}` : '/vehicles';
  };

  return (
    <PublicShell>
      <div className="border-b border-sand-200 bg-white">
        <div className="container-page py-9 sm:py-11">
          <nav aria-label="Breadcrumb" className="text-xs text-ink-400">
            <Link href="/" className="hover:text-ink-700">
              {t.nav.home}
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <span className="text-ink-600">{t.vehicles.title}</span>
          </nav>
          <h1 className="mt-3 text-3xl sm:text-4xl">
            {rentalEnabled ? t.vehicles.title : t.vehicles.titleSaleOnly}
          </h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] text-ink-500">
            {rentalEnabled ? t.vehicles.subtitle : t.vehicles.subtitleSaleOnly}
          </p>
        </div>
      </div>

      <div className="container-page py-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-10">
          <aside>
            <VehicleFiltersPanel
              communes={communes}
              filters={filters}
              rentalEnabled={rentalEnabled}
            />
          </aside>

          <section aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 pb-4">
              <p className="text-sm text-ink-500">
                <strong className="font-semibold text-ink-900">{formatNumber(results.total, locale)}</strong>{' '}
                {results.total === 1 ? t.common.result : t.common.results}
              </p>
              {results.total > 0 && (
                <p className="text-xs text-ink-400">
                  {t.common.page} {results.page} {t.common.of} {results.totalPages}
                </p>
              )}
            </div>

            {results.items.length === 0 ? (
              <EmptyState
                className="mt-8"
                icon={Car}
                title={rentalEnabled ? t.empty.vehiclesTitle : t.empty.vehiclesSaleTitle}
                body={rentalEnabled ? t.empty.vehiclesBody : t.empty.vehiclesSaleBody}
                action={
                  <Link
                    href="/vehicles"
                    className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-800"
                  >
                    {t.common.reset}
                  </Link>
                }
              />
            ) : (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
                {results.items.map((vehicle, index) => (
                  <li key={vehicle.id}>
                    <VehicleCard vehicle={vehicle} priority={index < 3} />
                  </li>
                ))}
              </ul>
            )}

            <Pagination
              page={results.page}
              totalPages={results.totalPages}
              buildHref={buildHref}
              labels={{
                previous: t.common.previous,
                next: t.common.next,
                page: t.common.page,
                of: t.common.of,
              }}
              rtl={locale === 'ar'}
              className="mt-10"
            />
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
