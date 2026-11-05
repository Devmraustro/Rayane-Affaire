'use client';

import { ExternalLink, MapPin, ShieldCheck } from 'lucide-react';
import type { Place } from '@/types';
import { useI18n } from '@/lib/i18n';
import { placesText } from '@/lib/i18n/place-copy';
import { ListingGallery } from '@/components/shared/listing-gallery';
import { PlaceMap } from './place-map';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

export function PlaceDetail({ place, preview = false }: { place: Place; preview?: boolean }) {
  const { t, locale, pick } = useI18n(); const copy = placesText(locale);
  const verified = place.locationStatus === 'verified' && place.coordinates !== null;
  const exact = verified && place.coordinatePrecision === 'exact';
  const navigation = exact && place.coordinates ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.coordinates.lat},${place.coordinates.lng}`)}` : null;
  return <div className="space-y-6">
    {preview && <p className="rounded-xl border border-info/30 bg-info-soft px-4 py-3 text-xs leading-5 text-info">{copy.previewNotice}</p>}
    <div className="grid gap-7 lg:grid-cols-[1.5fr_1fr]">
      <ListingGallery media={place.media} locale={locale} fallbackAlt={pick(place.name)} labels={{ gallery: t.properties.detail.gallery, photos: t.properties.detail.photos, noPhotos: t.properties.detail.noPhotos, previous: t.common.previous, next: t.common.next, close: t.nav.close }} />
      <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <Badge tone="gold">{copy.categories[place.category]}</Badge>
      <h1 className="mt-3 text-3xl font-semibold text-ink-950">{pick(place.name)}</h1>
      <p className="mt-3 flex items-center gap-2 text-sm text-ink-500"><MapPin className="size-4" />{pick(place.commune.name)} · {pick(place.commune.wilaya)}</p>
      <p className={`mt-4 rounded-xl px-3 py-3 text-xs leading-5 ${verified ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}><ShieldCheck className="me-1 inline size-4" />{verified ? exact ? copy.exactNotice : copy.approximateNotice : copy.noPublicLocation}</p>
      {navigation && <Button asChild variant="gold" className="mt-4 w-full"><a href={navigation} target="_blank" rel="noopener noreferrer"><ExternalLink />{copy.navigate}</a></Button>}
      <dl className="mt-5 space-y-3 border-t border-sand-100 pt-5 text-sm"><div><dt className="text-2xs uppercase tracking-wider text-ink-400">{copy.address}</dt><dd className="mt-1 text-ink-700">{pick(place.address) || '—'}</dd></div><div><dt className="text-2xs uppercase tracking-wider text-ink-400">{copy.reference}</dt><dd className="mt-1 font-mono text-xs text-ink-700">{place.reference}</dd></div><div><dt className="text-2xs uppercase tracking-wider text-ink-400">{copy.updated}</dt><dd className="mt-1 text-xs text-ink-700">{formatDate(place.updatedAt, locale)}</dd></div></dl>
      </section>
    </div>
    <section className="rounded-2xl border border-sand-200 bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold text-ink-900">{copy.about}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-600">{pick(place.description) || '—'}</p></section>
    <section className="rounded-2xl border border-sand-200 bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold text-ink-900">{copy.location}</h2><p className="mt-2 text-xs leading-5 text-ink-500">{verified ? exact ? copy.exactNotice : copy.approximateNotice : copy.noPublicLocation}</p>{verified && place.coordinates ? <div className="mt-4"><PlaceMap point={place.coordinates} center={place.coordinates} precision={place.coordinatePrecision} label={copy.location} className="h-[360px]" /></div> : <div className="mt-4 grid h-32 place-items-center rounded-xl border border-dashed border-sand-300 bg-sand-50 text-sm text-ink-400">{copy.locationUnverified}</div>}{!navigation && <p className="mt-3 text-2xs text-ink-400">{copy.navigationVerifiedOnly}</p>}</section>
  </div>;
}
