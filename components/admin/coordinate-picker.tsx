'use client';

import * as React from 'react';
import { MapPin, Crosshair, Info } from 'lucide-react';
import type { Commune } from '@/types';
import { useI18n } from '@/lib/i18n';
import { PropertyMap } from '@/components/map/property-map';
import { Input, Select, Field } from '@/components/ui/input';
import type { PropertyMapPoint } from '@/types';

/**
 * Coordinate entry with an explicit precision selector.
 *
 * The precision is not decoration: it is stored with the listing and shown to
 * the public. Choosing "en cours de vérification" clears the coordinates, so a
 * listing can never carry a guessed position.
 */
export function CoordinatePicker({
  communes,
  initial,
}: {
  communes: Commune[];
  initial: {
    lat: number | null;
    lng: number | null;
    precision: 'exact' | 'approximate' | 'commune' | 'pending';
    communeSlug: string;
    title: string;
  };
}) {
  const { t } = useI18n();
  const [precision, setPrecision] = React.useState(initial.precision);
  const [lat, setLat] = React.useState(initial.lat?.toString() ?? '');
  const [lng, setLng] = React.useState(initial.lng?.toString() ?? '');
  const [communeSlug, setCommuneSlug] = React.useState(initial.communeSlug);

  const commune = communes.find((item) => item.slug === communeSlug);
  const validLat = Number.parseFloat(lat);
  const validLng = Number.parseFloat(lng);
  const hasPoint =
    precision !== 'pending' && Number.isFinite(validLat) && Number.isFinite(validLng);

  const point: PropertyMapPoint | null = hasPoint
    ? {
        id: 'preview',
        slug: 'preview',
        reference: '—',
        title: { fr: initial.title || 'Aperçu', ar: initial.title || 'معاينة' },
        price: 0,
        priceUnit: 'total',
        transaction: 'rent_annual',
        category: 'apartment',
        coordinatePrecision: precision,
        commune: { slug: communeSlug, name: commune?.name ?? { fr: '', ar: '' } },
        thumbnailUrl: null,
        lat: validLat,
        lng: validLng,
      }
    : null;

  const useCommuneCentre = () => {
    if (!commune) return;
    setLat(commune.center.lat.toFixed(6));
    setLng(commune.center.lng.toFixed(6));
    setPrecision('commune');
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t.admin.form.precision} htmlFor="coordinatePrecision">
          <Select
            id="coordinatePrecision"
            name="coordinatePrecision"
            value={precision}
            onChange={(event) => {
              const next = event.target.value as typeof precision;
              setPrecision(next);
              if (next === 'pending') {
                setLat('');
                setLng('');
              }
            }}
          >
            <option value="pending">{t.labels.precision.pending}</option>
            <option value="commune">{t.labels.precision.commune}</option>
            <option value="approximate">{t.labels.precision.approximate}</option>
            <option value="exact">{t.labels.precision.exact}</option>
          </Select>
        </Field>
        <Field label={t.admin.form.latitude} htmlFor="lat">
          <Input
            id="lat"
            name="lat"
            type="number"
            step="0.000001"
            min={-90}
            max={90}
            dir="ltr"
            value={lat}
            disabled={precision === 'pending'}
            onChange={(event) => setLat(event.target.value)}
            placeholder="36.751234"
          />
        </Field>
        <Field label={t.admin.form.longitude} htmlFor="lng">
          <Input
            id="lng"
            name="lng"
            type="number"
            step="0.000001"
            min={-180}
            max={180}
            dir="ltr"
            value={lng}
            disabled={precision === 'pending'}
            onChange={(event) => setLng(event.target.value)}
            placeholder="5.064567"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useCommuneCentre}
          className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-white px-3 py-1.5 text-2xs font-medium text-ink-600 hover:border-gold-400"
        >
          <Crosshair aria-hidden="true" className="size-3" />
          {t.labels.precision.commune}
        </button>
        <p className="flex items-start gap-1.5 text-2xs leading-4 text-ink-400">
          <Info aria-hidden="true" className="mt-px size-3 shrink-0" />
          {precision === 'pending'
            ? t.properties.detail.pendingNotice
            : precision === 'commune'
              ? t.properties.detail.communeNotice
              : precision === 'approximate'
                ? t.properties.detail.approximateNotice
                : t.common.verifiedLocation}
        </p>
      </div>

      {point && (
        <PropertyMap
          points={[point]}
          className="h-[260px]"
          initialCenter={{ lat: point.lat, lng: point.lng }}
          initialZoom={15}
          frameAll
        />
      )}

      {/* Hidden fields keep the slug in sync for the parent form. */}
      <input type="hidden" name="communeSlugMirror" value={communeSlug} readOnly />
      <Field label={t.admin.form.commune} htmlFor="communeSlug">
        <Select
          id="communeSlug"
          name="communeSlug"
          value={communeSlug}
          onChange={(event) => setCommuneSlug(event.target.value)}
          required
        >
          {communes.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name.fr} — {item.name.ar}
            </option>
          ))}
        </Select>
      </Field>
      <p className="flex items-center gap-1.5 text-2xs text-ink-400">
        <MapPin aria-hidden="true" className="size-3" />
        {commune ? `${commune.center.lat}, ${commune.center.lng} (OSM #${commune.osmRelationId})` : ''}
      </p>
    </div>
  );
}
