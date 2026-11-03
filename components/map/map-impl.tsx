'use client';

import * as React from 'react';
import Link from 'next/link';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { Locale } from '@/types';
import { formatPriceWithUnit } from '@/lib/format';
import { SmartImage } from '@/components/shared/smart-image';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/config';
import type { MapLabels, PropertyMapProps } from './property-map';

/**
 * Leaflet + OpenStreetMap + MarkerCluster.
 *
 * Honesty of the map is the whole point here:
 *  * A marker only exists when the listing has coordinates AND its precision is
 *    not `pending`.
 *  * Marker styling and the popup both state the precision (`exact`,
 *    `approximate`, `commune`), so an approximate point can never be mistaken
 *    for a surveyed address.
 *  * Nothing is pinned "at the commune centre to fill the map".
 */
export function MapImpl({
  points,
  className,
  initialCenter,
  initialZoom,
  frameAll = false,
  labels,
  locale,
}: PropertyMapProps & { labels: MapLabels; locale: Locale }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const clusterRef = React.useRef<L.MarkerClusterGroup | null>(null);

  // --- initialise once ---------------------------------------------------
  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [initialCenter?.lat ?? DEFAULT_MAP_CENTER.lat, initialCenter?.lng ?? DEFAULT_MAP_CENTER.lng],
      zoom: initialZoom ?? DEFAULT_MAP_ZOOM,
      zoomControl: true,
      scrollWheelZoom: false, // avoid hijacking page scroll; enabled on click
      attributionControl: true,
    });

    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
      detectRetina: true,
    }).addTo(map);

    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 52,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (group) => {
        const count = group.getChildCount();
        const size = count > 24 ? 54 : count > 9 ? 46 : 38;
        return L.divIcon({
          html: `<span class="ra-cluster" style="width:${size}px;height:${size}px;font-size:${count > 99 ? 12 : 13}px">${count}</span>`,
          className: 'ra-cluster-wrapper',
          iconSize: L.point(size, size),
        });
      },
    });

    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
    // Intentionally initialise once: centre/zoom changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- markers ------------------------------------------------------------
  React.useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapRef.current;
    if (!cluster || !map) return;

    cluster.clearLayers();

    const valid = points.filter(
      (point) =>
        point.coordinatePrecision !== 'pending' &&
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng),
    );

    for (const point of valid) {
      const size = point.coordinatePrecision === 'commune' ? 26 : 30;
      const icon = L.divIcon({
        html: `<span class="ra-marker ra-marker--${point.coordinatePrecision}" style="width:${size}px;height:${size}px">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg>
               </span>`,
        className: 'ra-marker-wrapper',
        iconSize: L.point(size, size),
        iconAnchor: L.point(size / 2, size),
      });

      const popup = document.createElement('a');
      popup.href = `/properties/${encodeURIComponent(point.slug)}`;
      popup.className = 'block';
      popup.innerHTML = `
        <span class="block">
          ${
            point.thumbnailUrl
              ? `<img src="${escapeAttr(point.thumbnailUrl)}" alt="" class="h-24 w-full object-cover" loading="lazy" />`
              : ''
          }
          <span class="block p-3">
            <span class="block text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-700">${escapeHtml(
              labels.transaction[point.transaction] ?? '',
            )} · ${escapeHtml(labels.category[point.category] ?? '')}</span>
            <span class="mt-1 block font-display text-sm font-semibold text-ink-900">${escapeHtml(
              formatPriceWithUnit(point.price, point.priceUnit, locale),
            )}</span>
            <span class="mt-0.5 block line-clamp-2 text-xs leading-4 text-ink-600">${escapeHtml(
              point.title[locale] || point.title.fr,
            )}</span>
            <span class="mt-1.5 block text-[10px] text-ink-400">${escapeHtml(
              labels.precision[point.coordinatePrecision] ?? '',
            )} · ${escapeHtml(point.commune.name[locale] || point.commune.name.fr)}</span>
            <span class="mt-2 block text-[11px] font-semibold text-gold-700">${escapeHtml(
              labels.popupDetails,
            )} →</span>
          </span>
        </span>`;

      cluster.addLayer(L.marker([point.lat, point.lng], { icon, title: point.title[locale] || point.title.fr }).bindPopup(popup, {
        closeButton: true,
        maxWidth: 260,
        minWidth: 240,
      }));
    }

    if (valid.length && (frameAll || valid.length > 1)) {
      const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.22), { animate: false, maxZoom: 15 });
    } else if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 15, { animate: false });
    }
  }, [points, labels, locale, frameAll]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={labels.propertiesOnMap}
      className={
        'relative z-0 overflow-hidden rounded-2xl border border-sand-200 ' + (className ?? 'h-[420px]')
      }
    />
  );
}

/** Minimal escaping for the popup markup (values come from the database). */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

export { Link, SmartImage };
