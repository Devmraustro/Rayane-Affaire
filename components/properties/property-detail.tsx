'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bed, Bath, Ruler, Layers, Sofa, CalendarClock, CheckCircle2, Phone, MessageCircle,
  Share2, MapPin, ArrowLeft, ArrowRight, Video, FileText,
} from 'lucide-react';
import type { Property, PropertyMapPoint, PropertySummary } from '@/types';
import { useI18n } from '@/lib/i18n';
import { formatDate, formatPriceWithUnit } from '@/lib/format';
import { PHONE_NUMBER, WHATSAPP_NUMBER } from '@/lib/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/shared/demo-badge';
import { ListingGallery } from '@/components/shared/listing-gallery';
import { PrecisionBadge } from '@/components/shared/precision-badge';
import { InquiryForm } from '@/components/shared/inquiry-form';
import { LocationPanel } from '@/components/map/location-panel';
import { PropertyCard } from './property-card';
import { toast } from 'sonner';

export function PropertyDetail({
  property,
  mapPoint,
  similar,
}: {
  property: Property;
  mapPoint: PropertyMapPoint | null;
  similar: PropertySummary[];
}) {
  const { t, locale, pick, dir } = useI18n();
  const title = pick(property.title);
  const description = pick(property.description);
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t.common.copied);
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const specs = [
    { icon: Ruler, label: t.properties.detail.surface, value: locale === 'ar' ? `${property.surface} م²` : `${property.surface} m²` },
    property.bedrooms > 0 && { icon: Bed, label: t.properties.detail.bedrooms, value: String(property.bedrooms) },
    property.bathrooms > 0 && { icon: Bath, label: t.properties.detail.bathrooms, value: String(property.bathrooms) },
    property.floor != null && { icon: Layers, label: t.properties.detail.floor, value: String(property.floor) },
    { icon: Sofa, label: t.properties.detail.furnishing, value: t.labels.furnishing[property.furnishing] },
    { icon: CalendarClock, label: t.properties.detail.availability, value: t.labels.availability[property.availabilityStatus] },
  ].filter(Boolean) as { icon: typeof Ruler; label: string; value: string }[];

  return (
    <div className="bg-sand-50 pb-16">
      {/* Breadcrumb */}
      <div className="border-b border-sand-200 bg-white">
        <div className="container-page py-4">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
            <Link href="/" className="hover:text-ink-700">{t.nav.home}</Link>
            <span aria-hidden="true">/</span>
            <Link href="/properties" className="hover:text-ink-700">{t.nav.properties}</Link>
            <span aria-hidden="true">/</span>
            <span className="line-clamp-1 text-ink-600">{title}</span>
          </nav>
        </div>
      </div>

      <div className="container-page pt-6 lg:pt-8">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-gold-700"
        >
          <BackArrow aria-hidden="true" className="size-3.5" />
          {t.common.backToList}
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          {/* ---------------- main column ---------------- */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="ink">{t.labels.transaction[property.transaction]}</Badge>
                  <Badge tone="neutral">{t.labels.propertyCategory[property.category]}</Badge>
                  {property.featured && <Badge tone="gold">{locale === 'ar' ? 'مميز' : 'À la une'}</Badge>}
                  {property.isDemo && <DemoBadge />}
                </div>
                <h1 className="mt-2.5 text-2xl leading-snug sm:text-[1.75rem]">{title}</h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden="true" className="size-3.5" />
                    {pick(property.commune.name)}, {pick(property.commune.wilaya)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText aria-hidden="true" className="size-3.5" />
                    {t.common.reference} {property.reference}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-white px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-gold-400 hover:text-gold-700"
              >
                <Share2 aria-hidden="true" className="size-3.5" />
                {t.common.copy}
              </button>
            </div>

            <div className="mt-5">
              <ListingGallery
                media={property.media}
                locale={locale}
                fallbackAlt={title}
                labels={{
                  gallery: t.properties.detail.gallery,
                  photos: t.properties.detail.photos,
                  noPhotos: t.properties.detail.noPhotos,
                  previous: t.common.previous,
                  next: t.common.next,
                  close: t.nav.close,
                }}
              />
            </div>

            {/* Price (mobile) */}
            <div className="mt-5 flex items-baseline justify-between gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3.5 lg:hidden">
              <p className="font-display text-xl font-semibold text-ink-900">
                {formatPriceWithUnit(property.price, property.priceUnit, locale)}
              </p>
              <Badge tone={property.availabilityStatus === 'available' ? 'success' : 'warning'}>
                {t.labels.availability[property.availabilityStatus]}
              </Badge>
            </div>

            {/* Specs */}
            <section className="mt-6 rounded-2xl border border-sand-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-ink-900">{t.properties.detail.characteristics}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                {specs.map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <dt className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-ink-400">
                      <Icon aria-hidden="true" className="size-3.5 text-gold-600" />
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-ink-800">{value}</dd>
                  </div>
                ))}
              </dl>
              {property.availableFrom && (
                <p className="mt-4 rounded-lg bg-sand-50 px-3 py-2 text-xs text-ink-500">
                  {t.properties.detail.availableFrom} {formatDate(property.availableFrom, locale)}
                </p>
              )}
            </section>

            {/* Description */}
            <section className="mt-5 rounded-2xl border border-sand-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-ink-900">{t.properties.detail.description}</h2>
              <div className="prose-listing mt-3 whitespace-pre-line">
                {description || (locale === 'ar' ? 'لا يوجد وصف مضاف.' : 'Aucune description fournie.')}
              </div>

              {property.amenities.length > 0 && (
                <>
                  <h3 className="mt-6 text-sm font-semibold text-ink-800">
                    {t.properties.detail.amenities}
                  </h3>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {property.amenities.map((amenity) => (
                      <li
                        key={amenity}
                        className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-2.5 py-1 text-xs text-ink-600"
                      >
                        <CheckCircle2 aria-hidden="true" className="size-3 text-success" />
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {property.videoUrl && (
                <a
                  href={property.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-sand-300 px-3.5 py-2 text-xs font-medium text-ink-700 transition-colors hover:border-gold-400 hover:text-gold-700"
                >
                  <Video aria-hidden="true" className="size-3.5" />
                  {t.properties.detail.video}
                </a>
              )}
            </section>

            {/* Location */}
            <div className="mt-5 rounded-2xl border border-sand-200 bg-white p-5">
              <LocationPanel
                commune={property.commune}
                coordinates={property.coordinates}
                precision={property.coordinatePrecision}
                address={property.address}
                point={mapPoint}
              />
            </div>

            {/* Similar */}
            {similar.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-ink-900">{t.properties.detail.similar}</h2>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {similar.map((item) => (
                    <li key={item.id}>
                      <PropertyCard property={item} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ---------------- sticky sidebar ---------------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-card">
              <div className="hidden items-baseline justify-between gap-2 lg:flex">
                <p className="font-display text-2xl font-semibold text-ink-900">
                  {formatPriceWithUnit(property.price, property.priceUnit, locale)}
                </p>
                <Badge tone={property.availabilityStatus === 'available' ? 'success' : 'warning'}>
                  {t.labels.availability[property.availabilityStatus]}
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-400 lg:mt-4">
                <span>{t.common.reference} {property.reference}</span>
                <PrecisionBadge precision={property.coordinatePrecision} short />
              </div>

              <div className="mt-4 space-y-2">
                {WHATSAPP_NUMBER ? (
                  <Button asChild variant="gold" className="w-full">
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                        `Bonjour, je suis intéressé par le bien ${property.reference} — ${title}.`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle aria-hidden="true" />
                      {t.properties.detail.whatsappCta}
                    </a>
                  </Button>
                ) : null}

                {PHONE_NUMBER ? (
                  <Button asChild variant="primary" className="w-full">
                    <a href={`tel:${PHONE_NUMBER.replace(/\s/g, '')}`}>
                      <Phone aria-hidden="true" />
                      {t.properties.detail.callCta}
                    </a>
                  </Button>
                ) : (
                  <p className="rounded-xl border border-warning/25 bg-warning-soft px-3 py-2.5 text-xs leading-5 text-[#7a5312]">
                    {t.contact.contactPendingBody}
                  </p>
                )}
              </div>

              {mapPoint && (
                <Link
                  href={`/map?commune=${property.commune.slug}`}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-sand-300 px-4 py-2.5 text-xs font-medium text-ink-700 transition-colors hover:border-gold-400 hover:text-gold-700"
                >
                  <MapPin aria-hidden="true" className="size-3.5" />
                  {t.properties.detail.openMap}
                </Link>
              )}
            </div>

            <div className="mt-4">
              <InquiryForm
                propertyId={property.id}
                intent="property"
                compact
                title={t.properties.detail.contactCta}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
