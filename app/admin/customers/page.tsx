import { cookies } from 'next/headers';
import { Search, UserPlus } from 'lucide-react';
import { listCustomers } from '@/lib/db/customers';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { formatDate } from '@/lib/format';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const query = typeof params.q === 'string' ? params.q : '';
  const customers = listCustomers(query);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">{t.admin.nav.customers}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {customers.length} {t.common.results}
          </p>
        </div>
        <form action="/admin/customers" method="get" className="relative">
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

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-300 bg-white px-6 py-14 text-center">
          <UserPlus aria-hidden="true" className="mx-auto size-8 text-ink-300" />
          <p className="mt-3 text-sm text-ink-500">{t.admin.empty.customers}</p>
          <p className="mt-1 text-xs text-ink-400">
            {locale === 'ar'
              ? 'يُسجَّل العميل تلقائياً عند إنشاء أول حجز.'
              : 'Un client est créé automatiquement lors de sa première réservation.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-sand-200 bg-sand-50 text-2xs uppercase tracking-[0.08em] text-ink-400">
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.name}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.phone}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.type}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.inquiry.createdAt}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-sand-50/60">
                  <td className="px-4 py-3 font-medium text-ink-800">{customer.fullName}</td>
                  <td className="px-4 py-3 text-xs text-ink-600" dir="ltr">
                    {customer.phone}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500">
                    {customer.type === 'company'
                      ? locale === 'ar'
                        ? 'شركة'
                        : 'Société'
                      : locale === 'ar'
                        ? 'فرد'
                        : 'Particulier'}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400">
                    {formatDate(customer.createdAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-2xs text-ink-400">
        {locale === 'ar'
          ? 'لا تُنشأ أي بيانات عملاء وهمية: القائمة فارغة إلى أن تُسجَّل أولى الحجوزات.'
          : 'Aucune donnée client fictive n’est créée : la liste reste vide jusqu’aux premières réservations.'}
      </p>
    </div>
  );
}
