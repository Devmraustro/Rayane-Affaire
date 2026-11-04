import Link from 'next/link';
import { Building2, Car, MapPin, CheckCircle2 } from 'lucide-react';
import type { PublicStats } from '@/lib/db/stats';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { formatNumber } from '@/lib/format';
import type { Locale } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Public statistics.
 *
 * Server component, fed by `getPublicStats()` — every number is a COUNT over
 * published, non-demonstration rows. When the catalogue is empty we do not show
 * a row of zeros pretending to be a track record: we show an honest sentence
 * instead. This is the rule that removes GW's fabricated "250 biens" band.
 */
export function StatsBand({
  stats,
  t,
  locale,
  vehiclePublicVisible = true,
  rentalEnabled = true,
}: {
  stats: PublicStats;
  t: Dictionary;
  locale: Locale;
  /**
   * When rental is off the vehicle tile stays: it now counts the *sale* stock the
   * visitor can browse, so dropping it would under-report real inventory. The tile
   * is only omitted when that count is zero — "0 véhicule" would read as an empty
   * fleet rather than "nothing for sale right now".
   */
  /** Master switch: a hidden vehicle section contributes no public figure. */
  vehiclePublicVisible?: boolean;
  rentalEnabled?: boolean;
}) {
  if (stats.isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-sand-300 bg-white/70 px-6 py-8 text-center">
        <p className="text-sm text-ink-500">{t.home.statsEmpty}</p>
        <Link
          href="/contact"
          className="mt-3 inline-block text-sm font-medium text-gold-700 hover:underline"
        >
          {t.contact.title}
        </Link>
      </div>
    );
  }

  const allItems = [
    { key: 'properties', value: stats.publishedProperties, label: t.home.statsPublishedProperties, icon: Building2 },
    { key: 'vehicles', value: stats.publishedVehicles, label: t.home.statsPublishedVehicles, icon: Car },
    { key: 'communes', value: stats.coveredCommunes, label: t.home.statsCommunes, icon: MapPin },
    { key: 'available', value: stats.availableNow, label: t.home.statsAvailableNow, icon: CheckCircle2 },
  ] as const;
  // Rental off ⇒ the vehicle tile reflects sale inventory; hide it only when
  // there is genuinely nothing to count.
  // Hidden section ⇒ the vehicle tile does not exist. While visible it is shown
  // unless the real count is zero (an honest "nothing right now").
  const items = allItems.filter((item) =>
    item.key === 'vehicles'
      ? vehiclePublicVisible && (rentalEnabled || item.value > 0)
      : true,
  );

  return (
    <dl
      className={cn(
        'grid grid-cols-2 divide-sand-200 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card sm:divide-x rtl:sm:divide-x-reverse',
        items.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3',
      )}
    >
      {items.map(({ key, value, label, icon: Icon }) => (
        <div key={key} className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
          <Icon aria-hidden="true" className="size-4 text-gold-600" />
          <dd className="font-display text-2xl font-semibold tabular-nums text-ink-900 sm:text-[1.75rem]">
            {formatNumber(value, locale)}
          </dd>
          <dt className="text-2xs font-medium uppercase tracking-[0.1em] text-ink-400">{label}</dt>
        </div>
      ))}
    </dl>
  );
}
