import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Hero } from '@/components/home/hero';
import { StatsBand } from '@/components/home/stats-band';
import { FeaturedProperties, FeaturedVehicles } from '@/components/home/featured-sections';
import { ServicesSection } from '@/components/home/services-section';
import { WhyUsSection } from '@/components/home/why-us';
import { AboutSection } from '@/components/home/about-section';
import { CoverageSection } from '@/components/home/coverage';
import { ContactTeaser } from '@/components/home/contact-teaser';
import { PublicShell } from '@/components/shared/public-shell';
import { listCommunes } from '@/lib/db/communes';
import { listFeaturedProperties, listFeaturedVehicles } from '@/lib/db/featured';
import { getPublicStats } from '@/lib/db/stats';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

export const metadata: Metadata = {
  title: dictionaries.fr.meta.defaultTitle,
  description: dictionaries.fr.meta.defaultDescription,
  alternates: { canonical: '/' },
};

/** Re-build the marketing page at most every 5 minutes (real DB counts). */
export const revalidate = 300;

export default async function HomePage() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const communes = listCommunes({ activeOnly: true });
  const stats = getPublicStats();
  const properties = listFeaturedProperties(6);
  const vehicles = listFeaturedVehicles(3);

  return (
    <PublicShell transparentHeader>
      <Hero communes={communes} />

      <section className="border-b border-sand-200 bg-sand-50 py-10 sm:py-12">
        <div className="container-page">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">{t.home.statsTitle}</p>
              <p className="mt-1.5 max-w-lg text-sm text-ink-400">
                {locale === 'ar'
                  ? 'أرقام حقيقية مستخرجة من قاعدة بيانات الوكالة، تتحدث عند كل نشر.'
                  : 'Chiffres réels issus de la base de l’agence, mis à jour à chaque publication.'}
              </p>
            </div>
            <div className="w-full sm:max-w-2xl">
              <StatsBand stats={stats} t={t} locale={locale} />
            </div>
          </div>
        </div>
      </section>

      <FeaturedProperties items={properties} />
      <FeaturedVehicles items={vehicles} />
      <ServicesSection />
      <WhyUsSection />
      <AboutSection />
      <CoverageSection communes={communes} />
      <ContactTeaser />
    </PublicShell>
  );
}
