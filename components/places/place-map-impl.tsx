'use client';

import * as React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '@/lib/config';
import type { PlaceMapProps } from './place-map';

export function PlaceMapImpl({ point, center, precision, editable = false, onChange, label, className }: PlaceMapProps) {
  const container = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<L.Map | null>(null);
  const layer = React.useRef<L.LayerGroup | null>(null);
  const changeRef = React.useRef(onChange);
  changeRef.current = onChange;

  React.useEffect(() => {
    if (!container.current || map.current) return;
    const instance = L.map(container.current, { center: [center.lat, center.lng], zoom: 13, scrollWheelZoom: false });
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19, detectRetina: true }).addTo(instance);
    const group = L.layerGroup().addTo(instance);
    instance.on('click', (event: L.LeafletMouseEvent) => {
      if (editable) changeRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    map.current = instance;
    layer.current = group;
    return () => { instance.remove(); map.current = null; layer.current = null; };
    // The map is initialised once; subsequent points are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const instance = map.current;
    const group = layer.current;
    if (!instance || !group) return;
    group.clearLayers();
    if (point && Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
      if (precision === 'approximate') {
        L.circle([point.lat, point.lng], { radius: 350, color: '#b7791f', weight: 2, dashArray: '6 5', fillOpacity: 0.12 }).addTo(group);
      }
      const icon = L.divIcon({
        html: `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:${precision === 'exact' ? '#1B1B1D' : '#D9A622'};color:white;border:3px solid white;box-shadow:0 2px 8px #0004">●</span>`,
        className: 'ra-place-marker', iconSize: [30, 30], iconAnchor: [15, 15],
      });
      const marker = L.marker([point.lat, point.lng], { icon, draggable: editable, title: label }).addTo(group);
      marker.on('dragend', () => {
        const next = marker.getLatLng();
        changeRef.current?.({ lat: next.lat, lng: next.lng });
      });
      instance.setView([point.lat, point.lng], Math.max(instance.getZoom(), 14), { animate: false });
    } else {
      instance.setView([center.lat, center.lng], 13, { animate: false });
    }
    setTimeout(() => instance.invalidateSize(), 0);
  }, [point, center, precision, editable, label]);

  return <div ref={container} role="application" aria-label={label} data-testid="place-map" className={`relative z-0 overflow-hidden rounded-xl border border-sand-200 ${className ?? 'h-[320px]'}`} />;
}
