'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { Place } from '@/types';
import { useI18n } from '@/lib/i18n';
import { placesText } from '@/lib/i18n/place-copy';
import { SmartImage } from '@/components/shared/smart-image';
import { Badge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/shared/demo-badge';

export function PlaceCard({ place }: { place: Place }) {
  const { locale, pick } = useI18n(); const copy = placesText(locale); const name = pick(place.name);
  const status = place.locationStatus === 'verified' ? copy.locationVerified : place.locationStatus === 'unverified' ? copy.locationUnverified : copy.locationMissing;
  return <article className="group h-full overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
    <Link href={`/places/${encodeURIComponent(place.slug)}`} className="relative block aspect-[4/3] overflow-hidden" aria-label={name}>
      <SmartImage src={place.media[0]?.url} alt={place.media[0] ? pick(place.media[0].alt) : name} fill sizes="(max-width:640px) 92vw, 33vw" className="size-full" imgClassName="transition duration-500 group-hover:scale-[1.03]" />
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2"><Badge tone="glass">{copy.categories[place.category]}</Badge>{place.isDemo && <DemoBadge />}</div>
    </Link>
    <div className="p-4"><h2 className="line-clamp-2 text-lg font-semibold text-ink-900"><Link href={`/places/${encodeURIComponent(place.slug)}`}>{name}</Link></h2><p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500"><MapPin className="size-3.5" />{pick(place.commune.name)} · {pick(place.commune.wilaya)}</p><p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-2xs font-medium ${place.locationStatus === 'verified' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>{status}</p></div>
  </article>;
}
