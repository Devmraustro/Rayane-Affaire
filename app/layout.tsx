import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { Toaster } from 'sonner';
import './globals.css';
import { BRAND } from '@/lib/brand';
import { SITE_URL, LOCALE_COOKIE } from '@/lib/config';
import { I18nProvider } from '@/lib/i18n';
import { resolveLocale, dirFor } from '@/lib/i18n/locale';
import { dictionaries } from '@/lib/i18n/dictionaries';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: dictionaries.fr.meta.defaultTitle,
    template: `%s · ${BRAND.name}`,
  },
  description: dictionaries.fr.meta.defaultDescription,
  applicationName: BRAND.name,
  keywords: [
    'immobilier Béjaïa',
    'location appartement Béjaïa',
    'vente villa Béjaïa',
    'location voiture Béjaïa',
    'RAYANE AFFAIRE',
    'عقارات بجاية',
  ],
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
    title: dictionaries.fr.meta.defaultTitle,
    description: dictionaries.fr.meta.defaultDescription,
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: dictionaries.fr.meta.defaultTitle,
    description: dictionaries.fr.meta.defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
};

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
