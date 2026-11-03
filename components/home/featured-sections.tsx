'use client';

import Link from 'next/link';
import { Building2, Car } from 'lucide-react';
import type { PropertySummary, VehicleSummary } from '@/types';
import { useI18n } from '@/lib/i18n';
import { PropertyCard } from '@/components/properties/property-card';
import { VehicleCard } from '@/components/vehicles/vehicle-card';
import { SectionHeading } from '@/components/shared/section-heading';
import { EmptyState } from '@/components/shared/empty-state';
import { Reveal } from '@/components/shared/reveal';

export function FeaturedProperties({ items }: { items: PropertySummary[] }) {
  const { t, dir } = useI18n();
  return (
    <section className="bg-sand-50 py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={t.nav.properties}
          title={t.home.featuredProperties}
          lede={t.home.featuredPropertiesSub}
          action={{ href: '/properties', label: t.common.showAll }}
          rtl={dir === 'rtl'}
        />
        {items.length === 0 ? (
          <EmptyState
            className="mt-9"
            icon={Building2}
            title={t.home.noFeaturedProperties}
            body={t.home.noFeaturedPropertiesSub}
            action={
              <Link
                href="/contact"
                className="text-sm font-medium text-gold-700 underline-offset-4 hover:underline"
              >
                {t.home.contactTitle}
              </Link>
            }
          />
        ) : (
          <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {items.map((property, index) => (
              <Reveal as="li" key={property.id} delay={index * 70}>
                <PropertyCard property={property} priority={index < 2} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * Homepage vehicle spotlight.
 *
 * With rental off the same block advertises vehicle *sales*: the heading and the
 * "see all" label change, so the section never promises a rental offer the
 * agency does not have.
 */
export function FeaturedVehicles({
  items,
  rentalEnabled = true,
}: {
  items: VehicleSummary[];
  rentalEnabled?: boolean;
}) {
  const { t, dir } = useI18n();
  return (
    <section className="border-y border-sand-200 bg-white py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={rentalEnabled ? t.nav.vehicles : t.nav.vehicleSales}
          title={rentalEnabled ? t.home.featuredVehicles : t.home.featuredVehicleSales}
          lede={rentalEnabled ? t.home.featuredVehiclesSub : t.home.featuredVehicleSalesSub}
          action={{ href: '/vehicles', label: t.common.showAll }}
          rtl={dir === 'rtl'}
        />
        {items.length === 0 ? (
          <EmptyState
            className="mt-9"
            icon={Car}
            title={t.home.noFeaturedVehicles}
            body={t.home.noFeaturedVehiclesSub}
            action={
              <Link
                href="/contact"
                className="text-sm font-medium text-gold-700 underline-offset-4 hover:underline"
              >
                {t.home.contactTitle}
              </Link>
            }
          />
        ) : (
          <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {items.map((vehicle, index) => (
              <Reveal as="li" key={vehicle.id} delay={index * 70}>
                <VehicleCard vehicle={vehicle} priority={index === 0} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
