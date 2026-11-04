'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { Commune } from '@/types';
import { useI18n } from '@/lib/i18n';
import { SectionHeading } from '@/components/shared/section-heading';

/**
 * Coverage = the communes the agency actually operates in (seeded from verified
 * OSM relations). It is a capability list, not a claim of inventory in each.
 */
export function CoverageSection({ communes }: { communes: Commune[] }) {
  const { t, pick, locale } = useI18n();
  if (!communes.length) return null;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading
          eyebrow={t.about.coverageTitle}
          title={t.home.areasTitle}
          lede={t.about.coverageSub}
        />
        <ul className="mt-8 flex flex-wrap gap-2.5">
          {communes.map((commune) => (
            <li key={commune.id}>
              <Link
                href={`/properties?commune=${commune.slug}`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-sand-50 px-3.5 py-2 text-[0.8125rem] font-medium text-ink-700 transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-800"
              >
                <MapPin
                  aria-hidden="true"
                  className="size-3.5 text-ink-300 transition-colors group-hover:text-gold-600"
                />
                {pick(commune.name)}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3.5 py-2 text-[0.8125rem] font-medium text-white transition-colors hover:bg-ink-800"
            >
              {locale === 'ar' ? 'الخريطة' : t.map.title}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
