'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, KeyRound, Building, Car, ClipboardCheck, LineChart, Scale } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Reveal } from '@/components/shared/reveal';
import { SectionHeading } from '@/components/shared/section-heading';

/**
 * Services. Content is product copy (not fake statistics): each card promises a
 * concrete operational behaviour the agency actually performs.
 */
const SERVICES = [
  { icon: KeyRound, key: 'rental' },
  { icon: Building, key: 'sale' },
  { icon: Car, key: 'vehicles' },
  { icon: ClipboardCheck, key: 'management' },
  { icon: Scale, key: 'legal' },
  { icon: LineChart, key: 'advisory' },
] as const;

/**
 * `vehicles` is the vehicle-rental card. It is filtered out when the agency has
 * no rental service so the site never promises an offer that does not exist.
 */

const COPY = {
  fr: {
    rental: {
      title: 'Location résidentielle',
      body: 'Annuelle ou meublée courte durée. Visites organisées, état des lieux et bail rédigés par nos soins.',
    },
    sale: {
      title: 'Vente & acquisition',
      body: 'Estimation, mise en marché, sélection des acquéreurs et accompagnement jusqu’à l’acte.',
    },
    vehicles: {
      title: 'Location de véhicules',
      body: 'Citadines, berlines, SUV et utilitaires, révisés avant chaque location, à Béjaïa et alentours.',
    },
    management: {
      title: 'Gestion locative',
      body: 'Recouvrement, entretien, suivi des échéances et reporting régulier au propriétaire.',
    },
    legal: {
      title: 'Dossiers & conformité',
      body: 'Constitution et vérification des dossiers, pièces administratives et clauses contractuelles.',
    },
    advisory: {
      title: 'Conseil d’investissement',
      body: 'Analyse de rendement locatif par commune avant tout engagement.',
    },
  },
  ar: {
    rental: {
      title: 'الكراء السكني',
      body: 'سنوي أو مفروش قصير المدى. زيارات منظمة، معاينة مكتوبة وعقد كراء من إعدادنا.',
    },
    sale: {
      title: 'البيع والاقتناء',
      body: 'تقييم، عرض في السوق، انتقاء المشترين ومرافقة إلى غاية العقد.',
    },
    vehicles: {
      title: 'كراء السيارات',
      body: 'سيارات صغيرة، سيدان، سيارات رياضية ونفعية، تُعاين قبل كل كراء، في بجاية وضواحيها.',
    },
    management: {
      title: 'التسيير الإيجاري',
      body: 'التحصيل، الصيانة، متابعة الآجال وتقارير منتظمة للمالك.',
    },
    legal: {
      title: 'الملفات والمطابقة',
      body: 'إعداد وتدقيق الملفات، الوثائق الإدارية والشروط التعاقدية.',
    },
    advisory: {
      title: 'استشارة الاستثمار',
      body: 'تحليل مردودية الكراء حسب البلدية قبل أي التزام.',
    },
  },
} as const;

export function ServicesSection({ rentalEnabled = true }: { rentalEnabled?: boolean }) {
  const { t, locale, dir } = useI18n();
  const copy = COPY[locale];
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const services = rentalEnabled ? SERVICES : SERVICES.filter((item) => item.key !== 'vehicles');

  return (
    <section id="services" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={t.home.servicesTitle}
          title={t.services.title}
          lede={t.home.servicesSub}
          action={{ href: '/services', label: t.common.showAll }}
          rtl={dir === 'rtl'}
        />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {services.map(({ icon: Icon, key }, index) => (
            <Reveal as="li" key={key} delay={index * 60}>
              <div className="group h-full rounded-2xl border border-sand-200 bg-sand-50/60 p-5 transition-colors hover:border-gold-300 hover:bg-white sm:p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-ink-900 text-gold-400 transition-transform duration-300 ease-premium group-hover:-translate-y-0.5">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-4 text-[1.0625rem] font-semibold text-ink-900">{copy[key].title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">{copy[key].body}</p>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-[0.1em] text-gold-700 transition-colors hover:text-gold-800"
                >
                  {t.services.cta}
                  <Arrow aria-hidden="true" className="size-3" />
                </Link>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
