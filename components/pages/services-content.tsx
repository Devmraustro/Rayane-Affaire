'use client';

import Link from 'next/link';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

const CONTENT = {
  fr: [
    {
      title: 'Location résidentielle',
      lede: 'Annuelle ou meublée courte durée, à Béjaïa et dans les communes voisines.',
      points: [
        'Sélection de biens visités avant publication',
        'Dossier locataire vérifié (revenus, garanties)',
        'Bail, état des lieux et inventaire rédigés',
        'Remise des clés accompagnée',
      ],
    },
    {
      title: 'Vente & acquisition',
      lede: 'De l’estimation à la signature, avec une seule interlocutrice.',
      points: [
        'Estimation argumentée selon le marché local',
        'Reportage photo réalisé par nos soins',
        'Sélection des acquéreurs solvables',
        'Accompagnement notarial',
      ],
    },
    {
      kind: 'vehicleRental' as const,
      title: 'Location de véhicules',
      lede: 'Une flotte entretenue, livrée à l’adresse convenue.',
      points: [
        'Citadines, berlines, SUV et utilitaires',
        'Contrôle technique et révision à jour',
        'Kilométrage et conditions annoncés',
        'Prise en charge aéroport / port sur demande',
      ],
    },
    {
      title: 'Gestion locative',
      lede: 'Pour les propriétaires qui ne vivent pas sur place.',
      points: [
        'Encaissement des loyers et relances',
        'Coordination des travaux et de l’entretien',
        'Reporting mensuel documenté',
        'Gestion des entrées et sorties',
      ],
    },
  ],
  ar: [
    {
      title: 'الكراء السكني',
      lede: 'سنوي أو مفروش قصير المدى، في بجاية والبلديات المجاورة.',
      points: [
        'انتقاء العقارات بعد زيارتها قبل النشر',
        'تدقيق ملف المستأجر (المداخيل والضمانات)',
        'إعداد عقد الكراء والمعاينة والجرد',
        'تسليم المفاتيح بحضورنا',
      ],
    },
    {
      title: 'البيع والاقتناء',
      lede: 'من التقييم إلى التوقيع، بمخاطب واحد.',
      points: [
        'تقييم مُعلّل حسب السوق المحلي',
        'تصوير احترافي من إعدادنا',
        'انتقاء المشترين القادرين على الدفع',
        'المرافقة أمام الموثق',
      ],
    },
    {
      kind: 'vehicleRental' as const,
      title: 'كراء السيارات',
      lede: 'أسطول مُصان، يُسلَّم إلى العنوان المتفق عليه.',
      points: [
        'سيارات صغيرة، سيدان، رياضية ونفعية',
        'مراقبة تقنية وصيانة محدّثة',
        'عدد الكيلومترات والشروط معلنة',
        'نقل من المطار أو الميناء عند الطلب',
      ],
    },
    {
      title: 'التسيير الإيجاري',
      lede: 'للمالكين غير المقيمين في الولاية.',
      points: [
        'تحصيل الإيجارات والمتابعة',
        'تنسيق الأشغال والصيانة',
        'تقرير شهري موثّق',
        'تسيير الدخول والخروج',
      ],
    },
  ],
} as const;

export function ServicesContent({
  vehiclePublicVisible = true,
  rentalEnabled = true,
}: {
  vehiclePublicVisible?: boolean;
  rentalEnabled?: boolean;
}) {
  const { t, locale, dir } = useI18n();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  // The vehicle-rental service is listed only when the agency actually offers it;
  // the numbering is recomputed so the list never skips a number.
  const items = CONTENT[locale].filter(
    (item) =>
      (vehiclePublicVisible && rentalEnabled) ||
      !('kind' in item && item.kind === 'vehicleRental'),
  );

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">{t.nav.services}</p>
        <h1 className="mt-2.5 text-3xl sm:text-4xl">{t.services.title}</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-500">{t.services.subtitle}</p>
      </div>

      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        {items.map((item, index) => (
          <li
            key={item.title}
            className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card"
          >
            <span className="font-display text-2xs font-semibold uppercase tracking-[0.14em] text-gold-700">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-500">{item.lede}</p>
            <ul className="mt-4 space-y-2">
              {item.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-ink-700">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                  {point}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-2xl bg-ink-950 p-6 text-center sm:p-9">
        <h2 className="text-xl text-white sm:text-2xl">{t.home.contactTitle}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">{t.home.contactSub}</p>
        <Button asChild variant="gold" className="mt-5">
          <Link href="/contact">
            {t.services.cta}
            <Arrow aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
