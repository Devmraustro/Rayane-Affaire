'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPinned, Info, SlidersHorizontal } from 'lucide-react';
import type { Commune, PropertyMapPoint } from '@/types';
import { useI18n } from '@/lib/i18n';
import { PropertyMap } from './property-map';
import { Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { formatNumber } from '@/lib/format';

/**
 * Map explorer page body.
 *
 *  * Client-side commune filtering without a round trip (points are already
 *    loaded, capped at 500 by the query).
 *  * A legend that explains the three marker types — the honesty feature.
 *  * An explicit count of published listings that are NOT on the map because
 *    their position is unverified.
 */
export function MapExplorer({
  points,
  communes,
  selectedCommune,
  hiddenCount,
}: {
  points: PropertyMapPoint[];
  communes: Commune[];
  selectedCommune: string;
  hiddenCount: number;
}) {
  const { t, locale, pick } = useI18n();
  const router = useRouter();
  const [commune, setCommune] = React.useState(selectedCommune);

  const visible = React.useMemo(
    () => (commune ? points.filter((point) => point.commune.slug === commune) : points),
    [points, commune],
  );

  const center = React.useMemo(() => {
    const target = communes.find((c) => c.slug === commune);
    return target ? target.center : undefined;
  }, [commune, communes]);

  const zoom = React.useMemo(() => {
    const target = communes.find((c) => c.slug === commune);
    return target ? target.defaultZoom : undefined;
  }, [commune, communes]);

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{t.nav.map}</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">{t.map.title}</h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] text-ink-500">{t.map.subtitle}</p>
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="map-commune" className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400">
            <SlidersHorizontal aria-hidden="true" className="size-3" />
            {t.map.filterCommune}
          </label>
          <Select
            id="map-commune"
            value={commune}
            onChange={(event) => {
              setCommune(event.target.value);
              const query = event.target.value ? `?commune=${event.target.value}` : '';
              router.replace(`/map${query}`, { scroll: false });
            }}
          >
            <option value="">{t.common.all}</option>
            {communes.map((item) => (
              <option key={item.id} value={item.slug}>
                {pick(item.name)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          {visible.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title={t.empty.mapTitle}
              body={t.empty.mapBody}
              className="min-h-[420px]"
            />
          ) : (
            <PropertyMap
              points={visible}
              className="h-[520px] sm:h-[600px]"
              initialCenter={center}
              initialZoom={zoom}
            />
          )}
          <p className="mt-2.5 flex items-start gap-1.5 text-2xs leading-4 text-ink-400">
            <Info aria-hidden="true" className="mt-px size-3 shrink-0" />
            {t.map.privacyNotice}
          </p>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-sand-200 bg-white p-4">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-gold-700">
              {t.map.legend}
            </p>
            <ul className="mt-3 space-y-2.5 text-xs text-ink-600">
              <li className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-full bg-[#946312] ring-2 ring-white ring-offset-1 ring-offset-sand-200" />
                {t.labels.precision.exact}
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-full bg-[#b98417] ring-2 ring-white ring-offset-1 ring-offset-sand-200" />
                {t.labels.precision.approximate}
              </li>
              <li className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-full border-2 border-dashed border-white bg-[#63636b] ring-1 ring-sand-300" />
                {t.labels.precision.commune}
              </li>
            </ul>
            <p className="mt-3 border-t border-sand-100 pt-3 text-xs text-ink-500">
              <strong className="font-semibold text-ink-900">
                {formatNumber(visible.length, locale)}
              </strong>{' '}
              {t.map.propertiesOnMap}
            </p>
          </div>

          {hiddenCount > 0 && (
            <div className="rounded-2xl border border-warning/25 bg-warning-soft p-4 text-xs leading-5 text-[#7a5312]">
              <p className="font-semibold">{t.map.hiddenNotice}</p>
              <p className="mt-1">
                <Badge tone="warning">{hiddenCount}</Badge>
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-sand-200 bg-white p-4">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-400">
              {t.nav.properties}
            </p>
            <ul className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pe-1">
              {visible.slice(0, 40).map((point) => (
                <li key={point.id}>
                  <Link
                    href={`/properties/${encodeURIComponent(point.slug)}`}
                    className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-sand-100"
                  >
                    <span className="line-clamp-1 text-xs font-medium text-ink-800">
                      {pick(point.title)}
                    </span>
                    <span className="mt-0.5 block text-2xs text-ink-400">
                      {pick(point.commune.name)} · {t.labels.precisionShort[point.coordinatePrecision]}
                    </span>
                  </Link>
                </li>
              ))}
              {visible.length > 40 && (
                <li className="px-2 pt-1 text-2xs text-ink-400">+{visible.length - 40}…</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
