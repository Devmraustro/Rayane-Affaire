'use client';

import Link from 'next/link';
import {
  Fuel, Settings2, Users, DoorOpen, Gauge, CalendarClock, CheckCircle2, Phone, MessageCircle,
  MapPin, ArrowLeft, ArrowRight, FileText,
} from 'lucide-react';
import type { Vehicle, VehicleSummary } from '@/types';
import { useI18n } from '@/lib/i18n';
import { formatPrice } from '@/lib/format';
import { PHONE_NUMBER, WHATSAPP_NUMBER } from '@/lib/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/shared/demo-badge';
import { ListingGallery } from '@/components/shared/listing-gallery';
import { InquiryForm } from '@/components/shared/inquiry-form';
import { VehicleCard } from './vehicle-card';

export function VehicleDetail({
  vehicle,
  similar,
  rentalEnabled = true,
}: {
  vehicle: Vehicle;
  similar: VehicleSummary[];
  /**
   * With rental off, a sale listing must not show rental price, per-day unit,
   * "pickup" wording or a reservation intent — those are rental actions.
   */
  rentalEnabled?: boolean;
}) {
  const { t, locale, pick, dir } = useI18n();
  const title = pick(vehicle.title);
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const specs = [
    { icon: CalendarClock, label: t.vehicles.detail.year, value: String(vehicle.year) },
    { icon: Settings2, label: t.vehicles.detail.transmission, value: t.labels.transmission[vehicle.transmission] },
    { icon: Fuel, label: t.vehicles.detail.fuel, value: t.labels.fuel[vehicle.fuel] },
    { icon: Users, label: t.vehicles.detail.seats, value: String(vehicle.seats) },
    { icon: DoorOpen, label: t.vehicles.detail.doors, value: String(vehicle.doors) },
    ...(vehicle.mileageKm != null
      ? [{ icon: Gauge, label: t.vehicles.detail.mileage, value: `${vehicle.mileageKm.toLocaleString('fr-DZ')} km` }]
      : []),
  ];

  return (
    <div className="bg-sand-50 pb-16">
      <div className="border-b border-sand-200 bg-white">
        <div className="container-page py-4">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
            <Link href="/" className="hover:text-ink-700">{t.nav.home}</Link>
            <span aria-hidden="true">/</span>
            <Link href="/vehicles" className="hover:text-ink-700">{t.nav.vehicles}</Link>
            <span aria-hidden="true">/</span>
            <span className="line-clamp-1 text-ink-600">{title}</span>
          </nav>
        </div>
      </div>

      <div className="container-page pt-6 lg:pt-8">
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-gold-700"
        >
          <BackArrow aria-hidden="true" className="size-3.5" />
          {t.common.backToList}
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="ink">{t.labels.dealType[vehicle.dealType]}</Badge>
              <Badge tone="neutral">{t.labels.vehicleCategory[vehicle.category]}</Badge>
              {vehicle.featured && <Badge tone="gold">{locale === 'ar' ? 'مميز' : 'À la une'}</Badge>}
              {vehicle.isDemo && <DemoBadge />}
            </div>

            <h1 className="mt-2.5 text-2xl leading-snug sm:text-[1.75rem]">{title}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-400">
              <span>
                {vehicle.brand} {vehicle.model} · {vehicle.year}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5" />
                {pick(vehicle.commune.name)}
              </span>
              <span className="inline-flex items-center gap-1">
                <FileText aria-hidden="true" className="size-3.5" />
                {t.common.reference} {vehicle.reference}
              </span>
            </p>

            <div className="mt-5">
              <ListingGallery
                media={vehicle.media}
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
            </section>

            <section className="mt-5 rounded-2xl border border-sand-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-ink-900">{t.vehicles.detail.description}</h2>
              <div className="prose-listing mt-3 whitespace-pre-line">
                {pick(vehicle.description) ||
                  (locale === 'ar' ? 'لا يوجد وصف مضاف.' : 'Aucune description fournie.')}
              </div>
              {vehicle.features.length > 0 && (
                <>
                  <h3 className="mt-6 text-sm font-semibold text-ink-800">{t.vehicles.detail.features}</h3>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {vehicle.features.map((feature) => (
                      <li
                        key={feature}
                        className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-2.5 py-1 text-xs text-ink-600"
                      >
                        <CheckCircle2 aria-hidden="true" className="size-3 text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {similar.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-ink-900">{t.vehicles.detail.similar}</h2>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {similar.map((item) => (
                    <li key={item.id}>
                      <VehicleCard vehicle={item} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-card">
              <div className="space-y-1">
                {rentalEnabled && vehicle.dailyPrice != null && (
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400">
                      {t.vehicles.detail.rentalPrice}
                    </span>
                  </p>
                )}
                {rentalEnabled && vehicle.dailyPrice != null && (
                  <p className="font-display text-2xl font-semibold text-ink-900">
                    {formatPrice(vehicle.dailyPrice, locale)}{' '}
                    <span className="text-sm font-normal text-ink-400">{t.common.perDay}</span>
                  </p>
                )}
                {/* A sale-only presentation leads with the sale figure. */}
                {!rentalEnabled && vehicle.salePrice != null && (
                  <p className="font-display text-2xl font-semibold text-ink-900">
                    {formatPrice(vehicle.salePrice, locale)}
                  </p>
                )}
                {/* With rental on, the sale figure is the secondary line under the
                    per-day price. With rental off it is already the headline above,
                    so repeating it would print the same number twice. */}
                {rentalEnabled && vehicle.salePrice != null && (
                  <p className="text-sm text-ink-600">
                    {t.vehicles.detail.salePrice}: <strong className="font-semibold">{formatPrice(vehicle.salePrice, locale)}</strong>
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                <Badge tone={vehicle.availabilityStatus === 'available' ? 'success' : 'warning'}>
                  {t.labels.availability[vehicle.availabilityStatus]}
                </Badge>
                <span className="text-ink-400">{vehicle.reference}</span>
              </div>

              <div className="mt-4 space-y-2">
                {WHATSAPP_NUMBER && rentalEnabled && (
                  <Button asChild variant="gold" className="w-full">
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                        `Bonjour, je souhaite réserver ${vehicle.brand} ${vehicle.model} (${vehicle.reference}).`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle aria-hidden="true" />
                      {t.vehicles.detail.reserveCta}
                    </a>
                  </Button>
                )}
                {PHONE_NUMBER ? (
                  <Button asChild variant="primary" className="w-full">
                    <a href={`tel:${PHONE_NUMBER.replace(/\s/g, '')}`}>
                      <Phone aria-hidden="true" />
                      {t.contact.phone}
                    </a>
                  </Button>
                ) : (
                  <p className="rounded-xl border border-warning/25 bg-warning-soft px-3 py-2.5 text-xs leading-5 text-[#7a5312]">
                    {t.contact.contactPendingBody}
                  </p>
                )}
              </div>

              <p className="mt-4 flex items-center gap-1.5 border-t border-sand-100 pt-3 text-xs text-ink-400">
                <MapPin aria-hidden="true" className="size-3.5" />
                {rentalEnabled ? t.vehicles.detail.pickup : t.vehicles.detail.location}
                {': '}
                {pick(vehicle.commune.name)}
              </p>
            </div>

            <div className="mt-4">
              <InquiryForm
                vehicleId={vehicle.id}
                // "Reservation" is a rental intent (it also reveals the preferred
                // date field); a sale enquiry must not be filed as one.
                intent={rentalEnabled ? 'reservation' : 'vehicle'}
                compact
                title={t.vehicles.detail.contactCta}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
