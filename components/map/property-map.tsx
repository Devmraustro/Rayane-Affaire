'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { PropertyMapPoint } from '@/types';
import { useI18n } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Leaflet is loaded lazily and only in the browser.
 *
 * Leaflet reads `window` at import time, so it must never be evaluated during
 * SSR. `ssr: false` keeps ~150 kB of map code out of the first payload on every
 * page that is not actually a map.
 */
const MapImpl = dynamic(() => import('./map-impl').then((m) => m.MapImpl), {
  ssr: false,
  loading: () => <MapSkeleton className="h-[420px]" />,
});

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={
        'relative grid place-items-center overflow-hidden rounded-2xl border border-sand-200 bg-sand-100 ' +
        (className ?? '')
      }
      aria-busy="true"
    >
      <Skeleton className="absolute inset-0 rounded-none" />
      <span className="relative z-10 size-8 animate-spin rounded-full border-2 border-sand-300 border-t-gold-500" />
    </div>
  );
}

export interface PropertyMapProps {
  points: PropertyMapPoint[];
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  /** Frame all markers on mount (used on a property detail page). */
  frameAll?: boolean;
}

export function PropertyMap(props: PropertyMapProps) {
  const { t, locale } = useI18n();

  const labels = React.useMemo(
    () => ({
      popupDetails: t.map.popupDetails,
      clusterLabel: t.map.clusterLabel,
      propertiesOnMap: t.map.propertiesOnMap,
      precision: t.labels.precision,
      precisionShort: t.labels.precisionShort,
      transaction: t.labels.transaction,
      category: t.labels.propertyCategory,
      loading: t.common.loading,
    }),
    [t],
  );

  return <MapImpl {...props} labels={labels} locale={locale} />;
}

export type MapLabels = {
  popupDetails: string;
  clusterLabel: string;
  propertiesOnMap: string;
  precision: Record<string, string>;
  precisionShort: Record<string, string>;
  transaction: Record<string, string>;
  category: Record<string, string>;
  loading: string;
};
