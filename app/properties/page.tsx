import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { SearchX } from 'lucide-react';
import { PublicShell } from '@/components/shared/public-shell';
import { PropertyCard } from '@/components/properties/property-card';
import { PropertyFiltersPanel } from '@/components/properties/property-filters';
import { Pagination } from '@/components/shared/pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { listProperties } from '@/lib/db/properties';
import { listCommunes } from '@/lib/db/communes';
import { parsePropertySearchParams, toPropertyQuery } from '@/lib/filters';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { formatNumber } from '@/lib/format';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  const params = await searchParams;
  const page = parsePropertySearchParams(params).page;
  return {
    title: t.properties.title,
    description: t.properties.subtitle,
    alternates: { canonical: page > 1 ? `/properties?page=${page}` : '/properties' },
    openGraph: { title: `${t.properties.title} · RAYANE AFFAIRE`, description: t.properties.subtitle },
  };
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const params = await searchParams;
  const filters = parsePropertySearchParams(params);

  const communes = listCommunes({ activeOnly: true });
  // Public catalogue: demonstration rows are included only when they exist, and
  // every card carries an explicit "démonstration" badge (see PropertyCard).
  const results = listProperties(filters);

  const buildHref = (page: number) => {
    const query = toPropertyQuery({ ...filters, page });
    return query ? `/properties?${query}` : '/properties';
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
            <span className="text-ink-600">{t.properties.title}</span>
          </nav>
          <h1 className="mt-3 text-3xl sm:text-4xl">{t.properties.title}</h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] text-ink-500">{t.properties.subtitle}</p>
        </div>
      </div>

      <div className="container-page py-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-10">
          <aside>
            <PropertyFiltersPanel communes={communes} filters={filters} />
          </aside>

          <section aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 pb-4">
              <p className="text-sm text-ink-500">
                <strong className="font-semibold text-ink-900">
                  {formatNumber(results.total, locale)}
                </strong>{' '}
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
                icon={SearchX}
                title={t.empty.propertiesTitle}
                body={t.empty.propertiesBody}
                action={
                  <Link
                    href="/properties"
                    className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-800"
                  >
                    {t.common.reset}
                  </Link>
                }
              />
            ) : (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
                {results.items.map((property, index) => (
                  <li key={property.id}>
                    <PropertyCard property={property} priority={index < 3} />
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
