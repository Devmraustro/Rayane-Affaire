import type { Direction, Locale } from '@/types';

/**
 * Isomorphic locale utilities.
 *
 * Deliberately free of `'use client'` and of any React import so both Server
 * Components (layout, pages, metadata) and Client Components can use them.
 * The React context lives in `lib/i18n/index.tsx`.
 */

export const LOCALES: Locale[] = ['fr', 'ar'];
export const DEFAULT_LOCALE: Locale = 'fr';

export function isLocale(value: unknown): value is Locale {
  return value === 'fr' || value === 'ar';
}

export function dirFor(locale: Locale): Direction {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/** Resolves a raw cookie value to a supported locale, defaulting to French. */
export function resolveLocale(cookieValue: string | undefined | null): Locale {
  return isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;
}

/** BCP-47 tag for Intl and <html lang>. */
export function bcp47(locale: Locale): string {
  return locale === 'ar' ? 'ar-DZ' : 'fr-DZ';
}
