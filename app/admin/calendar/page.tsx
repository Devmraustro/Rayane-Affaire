import { cookies } from 'next/headers';
import { CalendarDays } from 'lucide-react';
import { listReservations } from '@/lib/db/reservations';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { formatPrice } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

/**
 * Calendar view.
 *
 * A real month grid built from reservation rows — no synthetic events. Days are
 * rendered for the current month and each reservation is placed by its start
 * date; occupancy is computed from the actual status.
 */
export default async function AdminCalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const monthParam = typeof params.month === 'string' ? params.month : '';
  const now = new Date();
  const [year, month] = /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam.split('-').map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];

  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const from = firstDay.toISOString().slice(0, 10);
  const to = lastDay.toISOString().slice(0, 10);

  const reservations = listReservations({ from, to, includeDemo: false });

  const daysInMonth = lastDay.getUTCDate();
  // Monday-first grid.
  const leadingBlanks = (firstDay.getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const monthLabel = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
    timeZone: 'UTC',
  }).format(firstDay);

  const previousMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;

  const weekdayLabels =
    locale === 'ar'
      ? ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح']
      : ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

  const eventsForDay = (day: number) => {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservations.filter((reservation) => reservation.startDate <= iso && reservation.endDate >= iso);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">{t.admin.nav.calendar}</h1>
          <p className="mt-1 text-sm capitalize text-ink-500">{monthLabel}</p>
        </div>
        <div className="flex gap-1.5">
          <a
            href={`/admin/calendar?month=${previousMonth}`}
            className="rounded-full border border-sand-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:border-gold-400"
          >
            {t.common.previous}
          </a>
          <a
            href="/admin/calendar"
            className="rounded-full border border-sand-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:border-gold-400"
          >
            {t.admin.finances.thisMonth}
          </a>
          <a
            href={`/admin/calendar?month=${nextMonth}`}
            className="rounded-full border border-sand-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:border-gold-400"
          >
            {t.common.next}
          </a>
        </div>
      </div>

      {reservations.length === 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-sand-300 bg-white px-4 py-3 text-xs text-ink-500">
          <CalendarDays aria-hidden="true" className="size-4 text-ink-300" />
          {t.admin.empty.calendar}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white p-3">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-1 pb-1">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="py-1 text-center text-2xs font-semibold uppercase tracking-[0.08em] text-ink-400"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day === null) return <div key={`blank-${index}`} className="min-h-[86px] rounded-lg bg-sand-50/40" />;
              const events = eventsForDay(day);
              const isToday =
                now.getUTCFullYear() === year &&
                now.getUTCMonth() + 1 === month &&
                now.getUTCDate() === day;
              return (
                <div
                  key={day}
                  className={
                    'min-h-[86px] rounded-lg border p-1.5 ' +
                    (isToday ? 'border-gold-400 bg-gold-50/40' : 'border-sand-200 bg-white')
                  }
                >
                  <span
                    className={
                      'text-2xs font-semibold ' + (isToday ? 'text-gold-800' : 'text-ink-400')
                    }
                  >
                    {day}
                  </span>
                  <ul className="mt-1 space-y-1">
                    {events.slice(0, 2).map((event) => (
                      <li key={event.id}>
                        <Badge
                          tone={
                            event.kind === 'vehicle' ? 'info' : event.status === 'confirmed' ? 'success' : 'neutral'
                          }
                          className="w-full justify-start truncate normal-case tracking-normal"
                        >
                          {event.itemReference}
                        </Badge>
                      </li>
                    ))}
                    {events.length > 2 && (
                      <li className="text-[0.625rem] text-ink-400">+{events.length - 2}</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {reservations.length > 0 && (
        <div className="rounded-2xl border border-sand-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-ink-900">{t.admin.nav.reservations}</h2>
          <ul className="mt-3 divide-y divide-sand-100">
            {reservations.map((reservation) => (
              <li key={reservation.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                <span className="min-w-0">
                  <span className="block font-medium text-ink-800">{reservation.itemReference}</span>
                  <span className="block text-ink-400">
                    {reservation.startDate} → {reservation.endDate} · {reservation.customerName}
                  </span>
                </span>
                <span className="tabular-nums text-ink-700">{formatPrice(reservation.amount, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
