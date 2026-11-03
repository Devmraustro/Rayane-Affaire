import { cookies } from 'next/headers';
import { CalendarCheck } from 'lucide-react';
import { listReservations } from '@/lib/db/reservations';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { formatDate, formatPrice } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

export default async function AdminReservationsPage() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const reservations = listReservations({ includeDemo: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">{t.admin.nav.reservations}</h1>
        <p className="mt-1 text-sm text-ink-500">
          {reservations.length} {t.common.results}
        </p>
      </div>

      {reservations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-300 bg-white px-6 py-14 text-center">
          <CalendarCheck aria-hidden="true" className="mx-auto size-8 text-ink-300" />
          <p className="mt-3 text-sm text-ink-500">{t.admin.empty.reservations}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-sand-200 bg-sand-50 text-2xs uppercase tracking-[0.08em] text-ink-400">
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.reference}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.item}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.customer}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.dates}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.amount}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t.admin.table.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-sand-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{reservation.reference}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-ink-800">{reservation.itemReference}</span>
                    <span className="mt-0.5 block text-2xs text-ink-400">
                      {t.labels.kind[reservation.kind]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-600">
                    {reservation.customerName}
                    <span className="mt-0.5 block text-2xs text-ink-400" dir="ltr">
                      {reservation.customerPhone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-600">
                    {formatDate(reservation.startDate, locale)} → {formatDate(reservation.endDate, locale)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs text-ink-800">
                    {formatPrice(reservation.amount, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        reservation.status === 'confirmed'
                          ? 'success'
                          : reservation.status === 'cancelled'
                            ? 'danger'
                            : reservation.status === 'completed'
                              ? 'neutral'
                              : 'warning'
                      }
                    >
                      {t.labels.reservationStatus[reservation.status]}
                    </Badge>
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
