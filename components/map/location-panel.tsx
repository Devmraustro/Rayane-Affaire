'use client';

import { MapPin, Info } from 'lucide-react';
import type { Commune, CoordinatePrecision, GeoPoint } from '@/types';
import { useI18n } from '@/lib/i18n';
import { PrecisionBadge } from '@/components/shared/precision-badge';
import { PropertyMap } from './property-map';
import type { PropertyMapPoint } from '@/types';

/**
 * Location block for a listing detail page.
 *
 * The notice text changes with the precision so the user always knows what they
 * are looking at. When there are no verified coordinates we show the commune and
 * a plain explanation — we never drop a marker on the commune centroid and call
 * it the property.
 */
export function LocationPanel({
  commune,
  coordinates,
  precision,
  address,
  point,
}: {
  commune: Commune;
  coordinates: GeoPoint | null;
  precision: CoordinatePrecision;
  address: { fr: string; ar: string };
  point?: PropertyMapPoint | null;
}) {
  const { t, pick } = useI18n();

  const notice =
    precision === 'approximate'
      ? t.properties.detail.approximateNotice
      : precision === 'commune'
        ? t.properties.detail.communeNotice
        : precision === 'pending'
          ? t.properties.detail.pendingNotice
          : null;

  const hasPoint = Boolean(coordinates) && precision !== 'pending' && Boolean(point);

  return (
    <section aria-labelledby="location-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="location-heading" className="text-lg font-semibold text-ink-900">
          {t.properties.detail.location}
        </h2>
        <PrecisionBadge precision={precision} />
      </div>

      <div className="mt-3 space-y-1 text-sm text-ink-600">
        <p className="flex items-start gap-2">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold-600" />
          <span>
            <strong className="font-medium text-ink-800">{pick(commune.name)}</strong>
            {address && (address.fr || address.ar) ? ` — ${pick(address)}` : null}
          </span>
        </p>
      </div>

      {notice && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-warning/25 bg-warning-soft px-3.5 py-3 text-xs leading-5 text-[#7a5312]">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {notice}
        </p>
      )}

      {hasPoint && point ? (
        <div className="mt-3">
          <PropertyMap
            points={[point]}
            className="h-[320px] sm:h-[380px]"
            initialCenter={commune.center}
            initialZoom={commune.defaultZoom}
            frameAll
          />
          <p className="mt-2 text-2xs text-ink-400">{t.map.privacyNotice}</p>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-5 py-10 text-center">
          <MapPin aria-hidden="true" className="mx-auto size-6 text-ink-300" />
          <p className="mt-2 text-sm text-ink-500">{t.properties.detail.pendingNotice}</p>
          <p className="mt-1 text-xs text-ink-400">{pick(commune.wilaya)}</p>
        </div>
      )}
    </section>
  );
}
