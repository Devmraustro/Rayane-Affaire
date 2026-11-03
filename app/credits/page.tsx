import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/shared/public-shell';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

/**
 * Credits and data sources.
 *
 * This page exists because the project uses third-party geographic data whose
 * licence requires attribution (OpenStreetMap / ODbL) and because the brief
 * forbids presenting imagery without a documented source. It is static content
 * generated from the two dictionaries, so it stays accurate in both languages.
 */
export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  return {
    title: t.credits.title,
    description: t.credits.subtitle,
    alternates: { canonical: '/credits' },
  };
}

export default async function CreditsPage() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  return (
    <PublicShell>
      <div className="container-page py-10 lg:py-14">
        <div className="max-w-2xl">
          <p className="eyebrow">{t.footer.legal}</p>
          <h1 className="mt-2.5 text-3xl sm:text-4xl">{t.credits.title}</h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-500">{t.credits.subtitle}</p>
        </div>

        <div className="mt-9 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-sand-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-900">OpenStreetMap</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">{t.credits.osmBody}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-gold-700 underline decoration-gold-300 underline-offset-2 hover:text-gold-800"
                >
                  © OpenStreetMap contributors — ODbL
                </a>
              </li>
              <li>
                <a
                  href="https://www.openstreetmap.org/fixthemap"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-ink-500 underline underline-offset-2 hover:text-ink-700"
                >
                  {t.credits.osmFix}
                </a>
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-sand-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-900">{t.credits.photosTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">{t.credits.photosBody}</p>
          </section>

          <section className="rounded-2xl border border-sand-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-900">{t.credits.illustrationsTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">{t.credits.illustrationsBody}</p>
          </section>

          <section className="rounded-2xl border border-sand-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-900">{t.credits.dataTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">{t.credits.dataBody}</p>
            <Link
              href="/contact"
              className="mt-3 inline-block text-sm text-gold-700 underline decoration-gold-300 underline-offset-2 hover:text-gold-800"
            >
              {t.nav.contact}
            </Link>
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
