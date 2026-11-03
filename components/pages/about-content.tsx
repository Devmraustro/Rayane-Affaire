'use client';

import Link from 'next/link';
import { ShieldCheck, MapPinned, Eye, Handshake } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { SmartImage } from '@/components/shared/smart-image';
import { BRAND as B } from '@/lib/brand';
import type { Commune } from '@/types';

const VALUES = {
  fr: [
    { icon: Eye, title: 'Transparence', body: 'Prix, périodicité et disponibilité publiés avant la visite. Le niveau de précision d’une position est toujours indiqué.' },
    { icon: ShieldCheck, title: 'Vérification', body: 'Aucune annonce n’est publiée sans visite préalable du bien par notre équipe.' },
    { icon: MapPinned, title: 'Ancrage local', body: 'Nous n’intervenons que dans les communes que nous connaissons réellement.' },
    { icon: Handshake, title: 'Engagement', body: 'Un interlocuteur unique du premier contact à la remise des clés.' },
  ],
  ar: [
    { icon: Eye, title: 'الشفافية', body: 'الثمن ودورية الدفع والتوفر معلنة قبل الزيارة. مستوى دقة الموقع يُذكر دائماً.' },
    { icon: ShieldCheck, title: 'المعاينة', body: 'لا يُنشر أي إعلان دون زيارة مسبقة للعقار من طرف فريقنا.' },
    { icon: MapPinned, title: 'جذور محلية', body: 'لا نعمل إلا في البلديات التي نعرفها فعلاً.' },
    { icon: Handshake, title: 'الالتزام', body: 'مخاطب واحد من أول اتصال إلى تسليم المفاتيح.' },
  ],
} as const;

export function AboutContent({
  communes,
  rentalEnabled = true,
}: {
  communes: Commune[];
  /** Rental is part of the agency's story, so the copy follows the setting. */
  rentalEnabled?: boolean;
}) {
  const { t, locale, pick } = useI18n();
  const values = VALUES[locale];

  return (
    <div>
      <div className="border-b border-sand-200 bg-white">
        <div className="container-page py-10 lg:py-14">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="eyebrow">{t.about.title}</p>
              <h1 className="mt-2.5 text-3xl sm:text-4xl">{B.positioning[locale]}</h1>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-500">
                {locale === 'ar'
                  ? 'ريان أعمال وكالة مستقلة تأسست سنة ' +
                    B.establishedYear +
                    ' وتعمل في ولاية بجاية. نجمع بين العقارات ' +
                    (rentalEnabled ? 'وكراء السيارات' : 'وبيع السيارات') +
                    ' لأن العميل نفسه غالباً يحتاج الاثنين في نفس الفترة.'
                  : 'RAYANE AFFAIRE est une agence indépendante fondée en ' +
                    B.establishedYear +
                    ', active dans la wilaya de Béjaïa. Nous réunissons l’immobilier et ' +
                    (rentalEnabled
                      ? 'la location de véhicules'
                      : 'la vente de véhicules') +
                    ' parce que le même client a souvent besoin des deux au même moment.'}
              </p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-500">
                {locale === 'ar'
                  ? 'هذه المنصة هي واجهتنا الرقمية: كل إعلان منشور هنا مسجّل في قاعدة بياناتنا، وكل رقم إحصائي معروض محسوب من نفس القاعدة. لا نعرض بيانات تجريبية كأنها حقيقية.'
                  : 'Cette plateforme est notre vitrine numérique : chaque annonce publiée ici est enregistrée dans notre base, et chaque statistique affichée est calculée à partir de cette même base. Aucune donnée de démonstration n’est présentée comme réelle.'}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card">
              <SmartImage
                src="/images/fallback/property-3.svg"
                alt={locale === 'ar' ? 'رسم توضيحي' : 'Illustration RAYANE AFFAIRE'}
                width={960}
                height={640}
                sizes="(max-width: 1024px) 92vw, 46vw"
                className="aspect-[4/3] w-full"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-12 lg:py-16">
        <h2 className="text-2xl sm:text-3xl">{t.about.valuesTitle}</h2>
        <ul className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-2xl border border-sand-200 bg-white p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-gold-50 text-gold-700">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-3.5 text-base font-semibold text-ink-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-500">{body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <h2 className="text-2xl sm:text-3xl">{t.about.coverageTitle}</h2>
          <p className="mt-2 text-sm text-ink-500">{t.about.coverageSub}</p>
          <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {communes.map((commune) => (
              <li key={commune.id}>
                <Link
                  href={`/properties?commune=${commune.slug}`}
                  className="flex items-center justify-between rounded-xl border border-sand-200 bg-white px-3.5 py-3 text-sm text-ink-700 transition-colors hover:border-gold-400 hover:text-gold-800"
                >
                  {pick(commune.name)}
                  <span className="text-2xs text-ink-300">{commune.wilayaCode}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-2xs text-ink-400">
            {locale === 'ar'
              ? 'مراكز البلديات مأخوذة من خرائط OpenStreetMap (ODbL).'
              : 'Centres de communes issus d’OpenStreetMap (ODbL).'}
          </p>
        </div>
      </div>
    </div>
  );
}
