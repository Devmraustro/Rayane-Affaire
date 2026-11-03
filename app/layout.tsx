import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { Toaster } from 'sonner';
import './globals.css';
import { BRAND } from '@/lib/brand';
import { SITE_URL, LOCALE_COOKIE } from '@/lib/config';
import { I18nProvider } from '@/lib/i18n';
import { resolveLocale, dirFor } from '@/lib/i18n/locale';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { isVehicleRentalEnabled } from '@/lib/db/settings';

/**
 * Site-wide metadata.
 *
 * Built per request rather than exported as a constant so the description and
 * keywords match what the site actually offers: leaving "location de véhicules"
 * in the default description would keep advertising a rental service after an
 * operator switched it off. The route is already dynamic (the locale cookie is
 * read in the layout), so this costs no extra rendering mode.
 */
export async function generateMetadata(): Promise<Metadata> {
  // A database that cannot be read must not break the whole site's metadata.
  const rentalEnabled = (() => {
    try {
      return isVehicleRentalEnabled();
    } catch {
      return true;
    }
  })();
  const meta = dictionaries.fr.meta;
  const description = rentalEnabled ? meta.defaultDescription : meta.defaultDescriptionNoRental;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: meta.defaultTitle,
      template: `%s · ${BRAND.name}`,
    },
    description,
    applicationName: BRAND.name,
    keywords: vehicleKeywords(rentalEnabled),
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
      locale: 'fr_DZ',
      alternateLocale: ['ar_DZ'],
      title: meta.defaultTitle,
      description,
      url: SITE_URL,
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.defaultTitle,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    },
  };
}

/** Search terms for the offer the agency actually has. */
function vehicleKeywords(rentalEnabled: boolean): string[] {
  return [
    'immobilier Béjaïa',
    'location appartement Béjaïa',
    'vente villa Béjaïa',
    rentalEnabled ? 'location voiture Béjaïa' : 'vente voiture Béjaïa',
    'RAYANE AFFAIRE',
    'عقارات بجاية',
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
