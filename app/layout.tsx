import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { Toaster } from 'sonner';
import './globals.css';
import { BRAND } from '@/lib/brand';
import { SITE_URL, LOCALE_COOKIE } from '@/lib/config';
import { I18nProvider } from '@/lib/i18n';
import { resolveLocale, dirFor } from '@/lib/i18n/locale';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { getVehicleVisibility } from '@/lib/db/settings';
import { HIDDEN_VEHICLES } from '@/lib/settings';

/**
 * Site-wide metadata.
 *
 * Built per request rather than exported as a constant so the description and
 * keywords match what the site actually offers: leaving "location de véhicules"
 * in the default description would keep advertising a vehicle section the client
 * has asked to hide. The route is already dynamic (the locale cookie is read in
 * the layout), so this costs no extra rendering mode.
 */
export async function generateMetadata(): Promise<Metadata> {
  // A database that cannot be read must not break the whole site's metadata. The
  // fallback is "hidden": under-rendering a claim is acceptable, leaking one is not.
  const visibility = (() => {
    try {
      return getVehicleVisibility();
    } catch {
      return HIDDEN_VEHICLES;
    }
  })();
  // Metadata follows the visitor's language, like the rest of the page. Serving a
  // French <title> on an Arabic document was the last place where the two
  // languages disagreed about what the site is.
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const meta = dictionaries[locale].meta;
  const title = visibility.publicVisible ? meta.defaultTitle : meta.defaultTitleRealEstate;
  const description = !visibility.publicVisible
    ? meta.defaultDescriptionRealEstate
    : visibility.rentalEnabled
      ? meta.defaultDescription
      : meta.defaultDescriptionNoRental;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s · ${BRAND.name}`,
    },
    description,
    applicationName: BRAND.name,
    keywords: vehicleKeywords(visibility, locale),
    authors: [{ name: BRAND.legalName }],
    creator: BRAND.legalName,
    publisher: BRAND.legalName,
    formatDetection: { telephone: true, address: true, email: true },
    alternates: {
      canonical: '/',
      languages: { fr: '/', ar: '/' },
    },
    openGraph: {
      type: 'website',
      siteName: BRAND.name,
      locale: locale === 'ar' ? 'ar_DZ' : 'fr_DZ',
      alternateLocale: [locale === 'ar' ? 'fr_DZ' : 'ar_DZ'],
      title,
      description,
      url: SITE_URL,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: process.env.APP_ENV === 'preview'
      ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
        },
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    },
  };
}

/**
 * Search terms for the offer the agency actually has.
 *
 * Keywords are invisible to visitors but very visible to search engines, so a
 * hidden vehicle section must not leave "location voiture" in them — that would
 * advertise the very section the client asked to remove.
 */
function vehicleKeywords(
  visibility: { publicVisible: boolean; rentalEnabled: boolean },
  locale: 'fr' | 'ar',
): string[] {
  const base =
    locale === 'ar'
      ? [
          'عقارات بجاية',
          'وكالة عقارية بجاية',
          'كراء شقق بجاية',
          'بيع فيلات بجاية',
          'أراضي بجاية',
          'محلات تجارية بجاية',
          'RAYANE AFFAIRE',
        ]
      : [
          'immobilier Béjaïa',
          'agence immobilière Béjaïa',
          'location appartement Béjaïa',
          'vente villa Béjaïa',
          'terrain Béjaïa',
          'local commercial Béjaïa',
          'RAYANE AFFAIRE',
          'عقارات بجاية',
        ];
  if (!visibility.publicVisible) return base;
  return [
    ...base,
    locale === 'ar'
      ? visibility.rentalEnabled
        ? 'كراء سيارات بجاية'
        : 'بيع سيارات بجاية'
      : visibility.rentalEnabled
        ? 'location voiture Béjaïa'
        : 'vente voiture Béjaïa',
  ];
}


export const viewport: Viewport = {
  themeColor: '#1B1B1D',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const dir = dirFor(locale);
  // `nonce` is provided by the middleware CSP; Next forwards it to its scripts.
  const nonce = (await headers()).get('x-csp-nonce') ?? undefined;

  return (
    <html lang={locale} dir={dir} nonce={nonce} suppressHydrationWarning>
      <body className="min-h-dvh bg-sand-50">
        {process.env.APP_ENV === 'preview' && (
          <div role="note" className="bg-warning-soft px-4 py-2 text-center text-2xs font-semibold text-warning">
            {locale === 'ar'
              ? 'معاينة معزولة · بيانات تجريبية فقط · لا توجد بيانات عملاء'
              : 'PRÉPRODUCTION ISOLÉE · Données de test uniquement · aucune donnée client'}
          </div>
        )}
        <a href="#main" className="skip-link">
          {locale === 'ar' ? 'تخطٍ إلى المحتوى' : 'Aller au contenu'}
        </a>
        <I18nProvider initialLocale={locale}>
          {children}
          <Toaster
            position={dir === 'rtl' ? 'top-left' : 'top-right'}
            toastOptions={{
              classNames: {
                toast: 'rounded-xl border border-sand-200 bg-white text-ink-800 shadow-panel',
              },
            }}
          />
        </I18nProvider>
      </body>
    </html>
  );
}
