import Link from 'next/link';
import { cookies } from 'next/headers';
import { Wallet, TrendingUp, Building2, Car } from 'lucide-react';
import { getFinanceSummary, getAdminStats } from '@/lib/db/stats';
import { listReservations } from '@/lib/db/reservations';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { formatDate, formatPrice } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Finances.
 *
 * Revenue = SUM of reservation amounts whose status is confirmed/active/completed
 * in the selected window. Demonstration reservations are excluded. An empty
 * database yields 0 DA everywhere — never a fabricated turnover figure.
 */
export default async function AdminFinancesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const period = typeof params.period === 'string' ? params.period : 'month';
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  const range =
    period === 'last-month'
      ? { from: iso(lastMonthStart), to: iso(lastMonthEnd) }
      : period === 'year'
        ? { from: iso(yearStart), to: iso(yearEnd) }
        : period === 'all'
          ? { from: '1970-01-01', to: '2999-12-31' }
          : { from: iso(monthStart), to: iso(monthEnd) };

  const summary = getFinanceSummary(range.from, range.to);
  const stats = getAdminStats();
  const reservations = listReservations({
    from: range.from === '1970-01-01' ? undefined : range.from,
    to: range.to === '2999-12-31' ? undefined : range.to,
    includeDemo: false,
  }).filter((reservation) => ['confirmed', 'active', 'completed'].includes(reservation.status));

  const tabs = [
    { key: 'month', label: t.admin.finances.thisMonth },
    { key: 'last-month', label: t.admin.finances.lastMonth },
    { key: 'year', label: t.admin.finances.thisYear },
    { key: 'all', label: t.admin.finances.all },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">{t.admin.nav.finances}</h1>
          <p className="mt-1 text-sm text-ink-500">{t.admin.finances.note}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/finances?period=${tab.key}`}
              aria-current={period === tab.key ? 'page' : undefined}
              className={
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors ' +
                (period === tab.key
                  ? 'bg-ink-900 text-white'
                  : 'border border-sand-300 bg-white text-ink-600 hover:border-gold-400')
              }
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Wallet} label={t.admin.finances.revenue} value={formatPrice(summary.revenue, locale)} />
        <Stat icon={TrendingUp} label={t.admin.finances.deposits} value={formatPrice(summary.deposits, locale)} />
        <Stat
          icon={Building2}
          label={t.labels.kind.property}
          value={formatPrice(summary.propertyRevenue, locale)}
        />
        <Stat icon={Car} label={t.labels.kind.vehicle} value={formatPrice(summary.vehicleRevenue, locale)} />
      </div>

      <div className="rounded-2xl border border-sand-200 bg-white">
        <header className="flex items-center justify-between border-b border-sand-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink-900">
            {t.admin.finances.count} · {summary.reservations}
          </h2>
          <span className="text-2xs text-ink-400">
            {t.admin.kpi.totalRevenue}: {formatPrice(stats.totalRevenue, locale)}
          </span>
        </header>

        {reservations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-400">{t.admin.empty.finances}</p>
        ) : (
          <ul className="divide-y divide-sand-100">
            {reservations.map((reservation) => (
              <li key={reservation.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-800">
                    {reservation.reference} · {reservation.itemReference}
                  </p>
                  <p className="text-2xs text-ink-400">
                    {reservation.customerName} · {formatDate(reservation.startDate, locale)} →{' '}
                    {formatDate(reservation.endDate, locale)}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-medium tabular-nums text-ink-900">
                    {formatPrice(reservation.amount, locale)}
                  </p>
                  <Badge tone="success">{t.labels.reservationStatus[reservation.status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <span className="text-2xs font-medium uppercase tracking-[0.1em] text-ink-400">{label}</span>
        <Icon aria-hidden="true" className="size-4 text-ink-300" />
      </div>
      <p className="mt-2 font-display text-xl font-semibold tabular-nums text-ink-900">{value}</p>
    </div>
  );
}
