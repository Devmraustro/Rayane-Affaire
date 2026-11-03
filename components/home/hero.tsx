'use client';

import Link from 'next/link';
import { ArrowRight, ArrowLeft, MapPin, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import { HeroSearch } from './hero-search';
import type { Commune } from '@/types';

/**
 * Homepage hero.
 *
 * Full-bleed photographic panel with an editorial headline. The background is
 * the branded placeholder artwork (not a stock photo of somebody's villa, which
 * would misrepresent the agency's inventory) and is replaced by the owner's own
 * hero photograph through `NEXT_PUBLIC_HERO_IMAGE`.
 */
export function Hero({ communes }: { communes: Commune[] }) {
  const { t, locale } = useI18n();
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;
  const heroImage = process.env.NEXT_PUBLIC_HERO_IMAGE || '/images/fallback/hero.svg';

  return (
    <section className="relative isolate overflow-hidden bg-ink-950">
      {/* Background: decorative, hidden from assistive tech (the copy carries meaning). */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt=""
          className="size-full object-cover"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-ink-950/45 to-ink-950/92" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_-10%,rgba(217,166,34,0.22),transparent_58%)]" />
      </div>

      <div className="container-page pb-14 pt-28 sm:pb-16 sm:pt-32 lg:pb-20 lg:pt-40">
        <div className="max-w-3xl">
          <p className="eyebrow text-gold-400">
            <MapPin aria-hidden="true" className="size-3.5" />
            {t.home.heroEyebrow}
          </p>

          <h1 className="mt-4 font-display text-[2.1rem] leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.65rem]">
            {t.home.heroTitle}
          </h1>

          <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-white/75 sm:text-base">
            {t.home.heroSubtitle}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild variant="gold" size="lg">
              <Link href="/properties">
                {t.home.heroCtaPrimary}
                <Arrow aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/10 text-white backdrop-blur-sm hover:border-white/40 hover:bg-white/15 hover:text-white"
            >
              <Link href="/vehicles">{t.home.heroCtaSecondary}</Link>
            </Button>
          </div>

          <p className="mt-6 inline-flex items-center gap-2 text-xs text-white/55">
            <ShieldCheck aria-hidden="true" className="size-4 text-gold-400" />
            {locale === 'ar'
              ? 'إعلانات مُعاينة، أسعار معلنة، وتوفّر صادق'
              : 'Annonces vérifiées, prix annoncés, disponibilité honnête'}
          </p>
        </div>

        <HeroSearch communes={communes} />
      </div>

      {/* Wordmark watermark — subtle brand presence, purely decorative. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 end-4 select-none font-display text-[16vw] font-semibold uppercase leading-none tracking-tight text-white/[0.03] lg:text-[9rem]"
      >
        {BRAND.shortName}
      </span>
    </section>
  );
}
