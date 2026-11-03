'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { BRAND } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/shared/smart-image';

/**
 * "About" block. Editorial two-column layout with a brand-owned illustration.
 * No invented founding statistics: the only factual claim is the established
 * year, which is configuration.
 */
export function AboutSection({ rentalEnabled = true }: { rentalEnabled?: boolean }) {
  const { t, locale, dir } = useI18n();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section id="about" className="bg-sand-100/60 py-16 sm:py-20 lg:py-24">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card">
            <SmartImage
              src="/images/fallback/property-4.svg"
              alt={locale === 'ar' ? 'رسم توضيحي للوكالة' : 'Illustration RAYANE AFFAIRE'}
              width={960}
              height={640}
              sizes="(max-width: 1024px) 92vw, 46vw"
              className="aspect-[4/3] w-full"
            />
          </div>
          <div className="absolute -bottom-5 start-5 rounded-xl border border-sand-200 bg-white px-4 py-3 shadow-card">
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-gold-700">
              {locale === 'ar' ? 'منذ' : 'Depuis'}
            </p>
            <p className="font-display text-xl font-semibold text-ink-900">
              {BRAND.establishedYear}
            </p>
          </div>
        </div>

        <div>
          <p className="eyebrow">{t.about.title}</p>
          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-[2.125rem] lg:leading-[1.15]">
            {(rentalEnabled ? BRAND.positioning : BRAND.positioningWithoutRental)[locale]}
          </h2>
          <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-500">
            {locale === 'ar'
              ? 'ريان أعمال وكالة مستقلة تعمل في ولاية بجاية. نبني عملنا على ثلاثة مبادئ: إعلانات مُعاينة، أسعار معلنة، وتوفر صادق. كل عقار منشور تتم زيارته من طرف فريقنا، وكل موقع نُشير إليه مصحوب بمستوى دقته.'
              : 'RAYANE AFFAIRE est une agence indépendante qui opère dans la wilaya de Béjaïa. Notre méthode tient en trois principes : des annonces vérifiées, des prix annoncés et une disponibilité honnête. Chaque bien publié est visité par notre équipe, et chaque position affichée est accompagnée de son niveau de précision.'}
          </p>
          {/* Rental is a marketing claim here, not just a menu entry: it goes when
              the service is switched off. Vehicle sales still remain on offer. */}
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-500">
            {rentalEnabled
              ? locale === 'ar'
                ? 'نرافق المالكين والمستأجرين والمشترين، ونضيف خدمة كراء السيارات لنفس العميل الذي يحتاج التنقل أثناء البحث أو الإقامة.'
                : 'Nous accompagnons propriétaires, locataires et acquéreurs, et complétons notre offre par la location de véhicules — utile au même client qui a besoin de se déplacer pendant une recherche ou un séjour.'
              : locale === 'ar'
                ? 'نرافق المالكين والمستأجرين والمشترين، ونعرض أيضا سيارات للبيع بعد معاينتها.'
                : 'Nous accompagnons propriétaires, locataires et acquéreurs, et proposons également des véhicules à la vente, chacun vérifié avant publication.'}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/about">
                {t.about.title}
                <Arrow aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">{t.contact.title}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
