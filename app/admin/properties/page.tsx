import Link from 'next/link';
import { cookies } from 'next/headers';
import { Plus, Search } from 'lucide-react';
import { listAdminProperties } from '@/lib/db/admin-listings';
import { StatusActions } from '@/components/admin/status-actions';
import { Badge } from '@/components/ui/badge';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { formatDateShort, formatPrice } from '@/lib/format';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPropertiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const status = typeof params.status === 'string' ? params.status : 'all';
  const query = typeof params.q === 'string' ? params.q : '';
  const demo = params.demo === '1';
  const geo = params.geo === 'missing' ? 'missing' : undefined;

  const rows = listAdminProperties({ status, query, demo, geo });

  const tabs = [
    { key: 'all', label: t.common.all },
    { key: 'published', label: t.labels.status.published },
    { key: 'draft', label: t.labels.status.draft },
    { key: 'archived', label: t.labels.status.archived },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">{t.admin.nav.properties}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {rows.length} {t.common.results}
            {demo ? ' · démonstration' : ''}
            {geo ? ' · sans position' : ''}
          </p>
        </div>
        <Link
          href="/admin/properties/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-xs font-medium text-white hover:bg-ink-800"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          {t.admin.newProperty}
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1" aria-label="Filtres">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === 'all' ? '/admin/properties' : `/admin/properties?status=${tab.key}`}
              aria-current={status === tab.key ? 'page' : undefined}
              className={
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors ' +
                (status === tab.key
                  ? 'bg-ink-900 text-white'
                  : 'border border-sand-300 bg-white text-ink-600 hover:border-gold-400')
              }
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <form action="/admin/properties" method="get" className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-3 my-auto size-3.5 text-ink-300"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t.admin.search}
            aria-label={t.admin.search}
            className="h-9 w-56 rounded-full border border-sand-300 bg-white ps-9 pe-3 text-xs focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-300 bg-white px-6 py-14 text-center">
          <p className="text-sm text-ink-500">{t.admin.empty.properties}</p>
          <Link
            href="/admin/properties/new"
            className="mt-3 inline-block rounded-full bg-ink-900 px-4 py-2 text-xs font-medium text-white"
          >
            {t.admin.newProperty}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-sand-200 bg-sand-50 text-2xs uppercase tracking-[0.08em] text-ink-400">
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.reference}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.title}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.commune}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.price}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.status}</th>
                <th className="px-4 py-2.5 text-end font-medium">{t.admin.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-sand-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{row.reference}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/properties/${row.id}/edit`}
                      className="font-medium text-ink-800 hover:text-gold-700"
                    >
                      {locale === 'ar' ? row.titleAr : row.titleFr}
                    </Link>
                    <span className="mt-1 flex flex-wrap items-center gap-1">
                      {row.mediaCount === 0 && <Badge tone="danger">{t.admin.form.noMedia}</Badge>}
                      {row.coordinatePrecision === 'pending' && (
                        <Badge tone="warning">{t.labels.precisionShort.pending}</Badge>
                      )}
                      {row.isDemo && <Badge tone="warning">{t.admin.settings.demoRecords}</Badge>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500">{row.commune}</td>
                  <td className="px-4 py-3 tabular-nums text-xs text-ink-700">
                    {formatPrice(row.price, locale)}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400">{formatDateShort(row.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <StatusActions kind="properties" id={row.id} status={row.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
