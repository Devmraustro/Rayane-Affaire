'use client';

import Link from 'next/link';
import { Fuel, Gauge, MapPin, Settings2, Users } from 'lucide-react';
import type { VehicleSummary } from '@/types';
import { useI18n } from '@/lib/i18n';
import { formatPrice } from '@/lib/format';
import { SmartImage } from '@/components/shared/smart-image';
import { Badge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/shared/demo-badge';
import { cn } from '@/lib/utils';

export function VehicleCard({
  vehicle,
  priority = false,
  className,
}: {
  vehicle: VehicleSummary;
  priority?: boolean;
  className?: string;
}) {
  const { t, locale, pick } = useI18n();
  const title = pick(vehicle.title);
  const href = `/vehicles/${encodeURIComponent(vehicle.slug)}`;

  const priceLabel =
    vehicle.dealType === 'sale'
      ? formatPrice(vehicle.salePrice ?? 0, locale)
      : vehicle.dailyPrice != null
        ? `${formatPrice(vehicle.dailyPrice, locale)} ${t.common.perDay}`
        : formatPrice(vehicle.salePrice ?? 0, locale);

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-card-hover',
        className,
      )}
    >
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden" aria-label={title}>
        <SmartImage
          src={vehicle.thumbnail?.url}
          alt={vehicle.thumbnail ? pick(vehicle.thumbnail.alt) || title : title}
          fill
          priority={priority}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
          className="size-full"
          imgClassName="transition-transform duration-700 ease-premium group-hover:scale-[1.035]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/45 via-transparent to-ink-950/10" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <Badge tone="glass">{t.labels.dealType[vehicle.dealType]}</Badge>
          <div className="flex flex-col items-end gap-1.5">
            {vehicle.featured && <Badge tone="gold">{locale === 'ar' ? 'مميز' : 'À la une'}</Badge>}
            {vehicle.isDemo && <DemoBadge />}
          </div>
        </div>
        <div className="absolute inset-x-3 bottom-3">
          <span className="rounded-lg bg-ink-950/55 px-2 py-1 text-2xs font-medium uppercase tracking-[0.08em] text-white backdrop-blur-sm">
            {t.labels.vehicleCategory[vehicle.category]} · {vehicle.year}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-[1.125rem]">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-[1.0625rem] font-semibold text-ink-900">{priceLabel}</p>
          <span
            className={cn(
              'text-2xs font-semibold uppercase tracking-[0.08em]',
              vehicle.availabilityStatus === 'available' ? 'text-success' : 'text-warning',
            )}
          >
            {t.labels.availability[vehicle.availabilityStatus]}
          </span>
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[0.9375rem] font-medium leading-snug text-ink-800">
          <Link href={href} className="hover:text-gold-700">
            {title}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-400">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          {pick(vehicle.commune.name)}
        </p>
        <dl className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-sand-100 pt-3.5 text-xs text-ink-500">
          <div className="flex items-center gap-1.5" title={t.labels.transmission[vehicle.transmission]}>
            <Settings2 aria-hidden="true" className="size-3.5 text-ink-300" />
            <dd>{t.labels.transmission[vehicle.transmission]}</dd>
          </div>
          <div className="flex items-center gap-1.5" title={t.labels.fuel[vehicle.fuel]}>
            <Fuel aria-hidden="true" className="size-3.5 text-ink-300" />
            <dd>{t.labels.fuel[vehicle.fuel]}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Users aria-hidden="true" className="size-3.5 text-ink-300" />
            <dd>
              {vehicle.seats} {locale === 'ar' ? 'مقعد' : 'pl.'}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge aria-hidden="true" className="size-3.5 text-ink-300" />
            <dd>{t.labels.vehicleCategory[vehicle.category]}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export function VehicleCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-sand-200 bg-white', className)}>
      <div className="aspect-[16/10] animate-pulse bg-sand-200/70" />
      <div className="space-y-2.5 p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-sand-200/80" />
        <div className="h-3.5 w-full animate-pulse rounded bg-sand-100" />
      </div>
    </div>
  );
}
