import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  Building2, Car, Inbox, Users, CalendarCheck, Wallet, MapPinOff, FileEdit, TrendingUp,
} from 'lucide-react';
import { getAdminStats } from '@/lib/db/stats';
import { listInquiries } from '@/lib/db/inquiries';
import { listReservations } from '@/lib/db/reservations';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { formatDate, formatPrice } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

/**
 * Dashboard overview.
 *
 * EVERY number on this page is a COUNT/SUM over the database (lib/db/stats.ts).
 * On an empty database each card reads 0 and the lists show their empty state —
 * there is no seeded "looks busy" data anywhere. Demonstration rows are counted
 * in their own card so the operator always knows how much of the catalogue is
 * not real inventory.
 */
export default async function AdminDashboard() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const stats = getAdminStats();
  const recentInquiries = listInquiries({ pageSize: 5 }).items;
  const upcoming = listReservations({ includeDemo: false }).slice(0, 5);

  const primary = [
    {
      label: t.admin.kpi.publishedProperties,
      value: stats.publishedProperties,
      icon: Building2,
      href: '/admin/properties?status=published',
      tone: 'gold' as const,
    },
    {
      label: t.admin.kpi.draftProperties,
      value: stats.draftProperties,
      icon: FileEdit,
      href: '/admin/properties?status=draft',
      tone: 'neutral' as const,
    },
    {
      label: t.admin.kpi.publishedVehicles,
      value: stats.publishedVehicles,
      icon: Car,
      href: '/admin/vehicles?status=published',
      tone: 'gold' as const,
    },
    {
      label: t.admin.kpi.newInquiries,
      value: stats.newInquiries,
      icon: Inbox,
      href: '/admin/inquiries?status=new',
      tone: 'info' as const,
    },
    {
      label: t.admin.kpi.upcomingReservations,
      value: stats.upcomingReservations,
      icon: CalendarCheck,
      href: '/admin/reservations',
      tone: 'neutral' as const,
    },
    {
      label: t.admin.kpi.activeCustomers,
      value: stats.activeCustomers,
      icon: Users,
      href: '/admin/customers',
      tone: 'neutral' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">{t.admin.overview}</h1>
          <p className="mt-1 text-sm text-ink-500">{t.admin.hint.zeroIsReal}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/properties/new"
            className="rounded-full bg-ink-900 px-4 py-2 text-xs font-medium text-white hover:bg-ink-800"
          >
            {t.admin.newProperty}
          </Link>
          <Link
            href="/admin/vehicles/new"
            className="rounded-full border border-sand-300 bg-white px-4 py-2 text-xs font-medium text-ink-700 hover:border-gold-400"
          >
            {t.admin.newVehicle}
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {primary.map(({ label, value, icon: Icon, href, tone }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-sand-200 bg-white p-4 transition-all hover:border-gold-300 hover:shadow-card"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xs font-medium uppercase tracking-[0.1em] text-ink-400">
                {label}
              </span>
              <Icon aria-hidden="true" className="size-4 text-ink-300 transition-colors group-hover:text-gold-600" />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-ink-900">
              {value}
            </p>
            <Badge tone={tone} className="mt-2">
              {value === 0 ? (locale === 'ar' ? 'لا بيانات' : 'Aucune donnée') : t.common.seeDetails}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Wallet}
          label={t.admin.kpi.monthlyRevenue}
          value={formatPrice(stats.monthlyRevenue, locale)}
          hint={t.admin.finances.note}
          href="/admin/finances"
        />
        <MetricCard
          icon={TrendingUp}
          label={t.admin.kpi.totalRevenue}
          value={formatPrice(stats.totalRevenue, locale)}
          href="/admin/finances?period=all"
        />
        <MetricCard
          icon={MapPinOff}
          label={t.admin.kpi.withoutCoordinates}
          value={String(stats.withoutCoordinates)}
          hint={t.admin.hint.withoutCoordinates}
          href="/admin/properties?geo=missing"
          alert={stats.withoutCoordinates > 0}
        />
        <MetricCard
          icon={FileEdit}
          label={t.admin.settings.demoRecords}
          value={String(stats.demoProperties + stats.demoVehicles)}
          hint={t.admin.seedWarning}
          href="/admin/properties?demo=1"
          alert={stats.demoProperties + stats.demoVehicles > 0}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Recent inquiries */}
        <section className="rounded-2xl border border-sand-200 bg-white">
          <header className="flex items-center justify-between border-b border-sand-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-900">{t.admin.nav.inquiries}</h2>
            <Link href="/admin/inquiries" className="text-2xs font-medium text-gold-700 hover:underline">
              {t.common.showAll}
            </Link>
          </header>
          {recentInquiries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-400">{t.admin.empty.inquiries}</p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {recentInquiries.map((inquiry) => (
                <li key={inquiry.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-800">
                        {inquiry.fullName}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-ink-400">{inquiry.message}</p>
                    </div>
                    <Badge
                      tone={
                        inquiry.status === 'new'
                          ? 'info'
                          : inquiry.status === 'won'
                            ? 'success'
                            : inquiry.status === 'spam'
                              ? 'danger'
                              : 'neutral'
                      }
                    >
                      {t.labels.inquiryStatus[inquiry.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-2xs text-ink-300" dir="ltr">
                    {inquiry.phone} · {formatDate(inquiry.createdAt, locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming reservations */}
        <section className="rounded-2xl border border-sand-200 bg-white">
          <header className="flex items-center justify-between border-b border-sand-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-900">{t.admin.nav.reservations}</h2>
            <Link href="/admin/reservations" className="text-2xs font-medium text-gold-700 hover:underline">
              {t.common.showAll}
            </Link>
          </header>
          {upcoming.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-400">{t.admin.empty.reservations}</p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {upcoming.map((reservation) => (
                <li key={reservation.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">
                      {reservation.itemReference} — {reservation.customerName}
                    </p>
                    <p className="text-2xs text-ink-400">
                      {reservation.startDate} → {reservation.endDate}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-medium tabular-nums text-ink-800">
                      {formatPrice(reservation.amount, locale)}
                    </p>
                    <Badge tone={reservation.status === 'confirmed' ? 'success' : 'neutral'}>
                      {t.labels.reservationStatus[reservation.status]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  alert = false,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-sand-200 bg-white p-4 transition-all hover:border-gold-300 hover:shadow-card"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xs font-medium uppercase tracking-[0.1em] text-ink-400">{label}</span>
        <Icon aria-hidden="true" className={alert ? 'size-4 text-warning' : 'size-4 text-ink-300'} />
      </div>
      <p className="mt-2 font-display text-xl font-semibold tabular-nums text-ink-900">{value}</p>
      {hint && <p className="mt-1 line-clamp-2 text-2xs leading-4 text-ink-400">{hint}</p>}
    </Link>
  );
}
