'use client';

import Link from 'next/link';
import { Bed, Bath, MapPin, Ruler, Images, Video } from 'lucide-react';
import type { PropertySummary } from '@/types';
import { useI18n } from '@/lib/i18n';
import { formatPriceWithUnit } from '@/lib/format';
import { SmartImage } from '@/components/shared/smart-image';
import { Badge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/shared/demo-badge';
import { PrecisionBadge } from '@/components/shared/precision-badge';
import { cn } from '@/lib/utils';

/**
 * Property card — the primary commercial unit of the site.
 *
 * Fixed 4:3 media area (so grids never jitter), price as the strongest element,
 * transaction type as a glass badge over the photo, and honesty markers
 * (demo / location precision) where they cannot be missed.
 */
export function PropertyCard({
  property,
  priority = false,
  className,
}: {
  property: PropertySummary;
  priority?: boolean;
  className?: string;
}) {
  const { t, locale, pick } = useI18n();
  const title = pick(property.title);
  const alt = property.thumbnail ? pick(property.thumbnail.alt) || title : title;
  const available = property.availabilityStatus === 'available';

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-card-hover',
        className,
      )}
    >
      <Link
        href={`/properties/${encodeURIComponent(property.slug)}`}
        className="relative block aspect-[4/3] overflow-hidden"
        aria-label={title}
      >
        <SmartImage
          src={property.thumbnail?.url}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1280px) 31vw, 30vw"
          className="size-full"
          imgClassName="transition-transform duration-700 ease-premium group-hover:scale-[1.035]"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/45 via-transparent to-ink-950/10" />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <Badge tone="glass">{t.labels.transaction[property.transaction]}</Badge>
          <div className="flex flex-col items-end gap-1.5">
            {property.featured && <Badge tone="gold">{locale === 'ar' ? 'مميز' : 'À la une'}</Badge>}
            {property.isDemo && <DemoBadge />}
            {property.withVideo && (
              <Badge tone="ink" className="gap-1">
                <Video aria-hidden="true" className="size-3" />
                {locale === 'ar' ? 'فيديو' : 'Vidéo'}
              </Badge>
            )}
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <span className="rounded-lg bg-ink-950/55 px-2 py-1 text-2xs font-medium uppercase tracking-[0.08em] text-white backdrop-blur-sm">
            {t.labels.propertyCategory[property.category]}
          </span>
          <span className="rounded-lg bg-white/92 px-2 py-1 text-2xs font-semibold text-ink-800">
            {property.reference}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-[1.125rem]">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-[1.0625rem] font-semibold text-ink-900">
            {formatPriceWithUnit(property.price, property.priceUnit, locale)}
          </p>
          <span
            className={cn(
              'text-2xs font-semibold uppercase tracking-[0.08em]',
              available ? 'text-success' : 'text-warning',
            )}
          >
            {t.labels.availability[property.availabilityStatus]}
          </span>
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-[0.9375rem] font-medium leading-snug text-ink-800">
          <Link href={`/properties/${encodeURIComponent(property.slug)}`} className="hover:text-gold-700">
            {title}
          </Link>
        </h3>

        <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-400">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          {pick(property.commune.name)}
        </p>

        <dl className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-sand-100 pt-3.5 text-xs text-ink-500">
          <div className="flex items-center gap-1.5">
            <Ruler aria-hidden="true" className="size-3.5 text-ink-300" />
            <dt className="sr-only">{t.properties.detail.surface}</dt>
            <dd>{locale === 'ar' ? `${property.surface} م²` : `${property.surface} m²`}</dd>
          </div>
          {property.bedrooms > 0 && (
            <div className="flex items-center gap-1.5">
              <Bed aria-hidden="true" className="size-3.5 text-ink-300" />
              <dt className="sr-only">{t.properties.detail.bedrooms}</dt>
              <dd>{property.bedrooms}</dd>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="flex items-center gap-1.5">
              <Bath aria-hidden="true" className="size-3.5 text-ink-300" />
              <dt className="sr-only">{t.properties.detail.bathrooms}</dt>
              <dd>{property.bathrooms}</dd>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Images aria-hidden="true" className="size-3.5 text-ink-300" />
            <dd>{t.labels.furnishing[property.furnishing]}</dd>
          </div>
        </dl>

        {property.coordinatePrecision !== 'exact' && (
          <div className="mt-3">
            <PrecisionBadge precision={property.coordinatePrecision} short />
          </div>
        )}
      </div>
    </article>
  );
}

export function PropertyCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-sand-200 bg-white', className)}>
      <div className="aspect-[4/3] animate-pulse bg-sand-200/70" />
      <div className="space-y-2.5 p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-sand-200/80" />
        <div className="h-3.5 w-full animate-pulse rounded bg-sand-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-sand-100" />
      </div>
    </div>
  );
}
