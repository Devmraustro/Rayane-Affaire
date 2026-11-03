'use client';

import { ShieldCheck, MapPinned, Camera, Clock, FileCheck2, HandHeart } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Reveal } from '@/components/shared/reveal';
import { SectionHeading } from '@/components/shared/section-heading';

const PILLARS = {
  fr: [
    {
      icon: Camera,
      title: 'Des annonces réellement vérifiées',
      body: 'Chaque bien publié est visité. Si une position n’est pas confirmée, nous l’indiquons clairement sur l’annonce.',
    },
    {
      icon: ShieldCheck,
      title: 'Prix affichés, sans surprise',
      body: 'Le prix, la périodicité et la disponibilité figurent sur l’annonce avant toute visite.',
    },
    {
      icon: MapPinned,
      title: 'Un ancrage local',
      body: 'Nous ne publions que dans les communes que nous couvrons réellement, pas dans toute la wilaya.',
    },
    {
      icon: FileCheck2,
      title: 'Des dossiers propres',
      body: 'Bail, état des lieux et pièces administratives préparés et relus avant signature.',
    },
    {
      icon: Clock,
      title: 'Une réponse rapide',
      body: 'Toute demande reçue est traitée dans la journée ouvrée, par téléphone, WhatsApp ou e-mail.',
    },
    {
      icon: HandHeart,
      title: 'Un interlocuteur unique',
      body: 'La même personne vous suit de la première visite à la remise des clés.',
    },
  ],
  ar: [
    {
      icon: Camera,
      title: 'إعلانات مُعاينة فعلاً',
      body: 'كل عقار منشور تتم زيارته. وإذا لم يكن الموقع مؤكداً، نوضح ذلك على الإعلان.',
    },
    {
      icon: ShieldCheck,
      title: 'أسعار معلنة بدون مفاجآت',
      body: 'الثمن ودورية الدفع والتوفر مذكورة على الإعلان قبل أي زيارة.',
    },
    {
      icon: MapPinned,
      title: 'جذور محلية',
      body: 'لا ننشر إلا في البلديات التي نغطيها فعلاً، لا في كل الولاية.',
    },
    {
      icon: FileCheck2,
      title: 'ملفات سليمة',
      body: 'عقد الكراء، المعاينة والوثائق الإدارية تُعد وتُدقق قبل التوقيع.',
    },
    {
      icon: Clock,
      title: 'رد سريع',
      body: 'كل طلب يُعالج في نفس يوم العمل، عبر الهاتف أو واتساب أو البريد.',
    },
    {
      icon: HandHeart,
      title: 'مخاطب واحد',
      body: 'نفس الشخص يرافقك من أول زيارة إلى تسليم المفاتيح.',
    },
  ],
} as const;

export function WhyUsSection() {
  const { t, locale } = useI18n();
  const pillars = PILLARS[locale];

  return (
    <section className="bg-ink-950 py-16 text-white sm:py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={t.home.whyTitle}
          title={locale === 'ar' ? 'شروط واضحة قبل كل شيء' : 'Des engagements clairs, pas des promesses'}
          tone="dark"
          align="center"
        />
        <ul className="mt-11 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }, index) => (
            <Reveal as="li" key={title} delay={index * 50}>
              <div className="flex gap-3.5">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-gold-400 ring-1 ring-white/10">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <h3 className="text-[0.9375rem] font-semibold text-white">{title}</h3>
                  <p className="mt-1.5 text-[0.8125rem] leading-6 text-white/60">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
