'use client';

import * as React from 'react';
import type { Direction, Locale, Translated } from '@/types';
import { LOCALE_COOKIE, STORAGE_KEYS } from '@/lib/config';
import { dictionaries, type Dictionary } from './dictionaries';
import { DEFAULT_LOCALE, LOCALES, dirFor, isLocale, resolveLocale } from './locale';

/**
 * Language runtime.
 *
 * The locale is resolved on the server from the `ra_locale` cookie and passed
 * into the provider, so the FIRST paint is already in the right language and
 * direction (no flash of French, no layout shift when switching to Arabic).
 * Switching writes the cookie and re-renders; `<html lang/dir>` is updated by
 * `LocaleDocumentSync` without a full reload.
 */

/** Re-exported for client callers; the implementations are isomorphic. */
export { DEFAULT_LOCALE, LOCALES, dirFor, isLocale, resolveLocale };

interface I18nValue {
  locale: Locale;
  dir: Direction;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  /** Resolves a bilingual field for the active locale, with a safe fallback. */
  pick: (value: Translated | undefined | null) => string;
  /** Replaces {placeholders} in a translated string. */
  tpl: (template: string, values: Record<string, string | number>) => string;
  /** Formats an already-translated message key (e.g. `form.phoneInvalid`). */
  msg: (key: string) => string;
}

const I18nContext = React.createContext<I18nValue | null>(null);

/** Walks a dot-path through the dictionary (`properties.detail.address`). */
function lookup(dict: Dictionary, path: string): string | undefined {
  const parts = path.split('.');
  let node: unknown = dict;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);
  const t = dictionaries[locale];
  const dir = dirFor(locale);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
      window.localStorage.setItem(STORAGE_KEYS.locale, next);
    } catch {
      /* private mode — the cookie is enough */
    }
  }, []);

  const toggleLocale = React.useCallback(() => {
    setLocale(locale === 'fr' ? 'ar' : 'fr');
  }, [locale, setLocale]);

  const pick = React.useCallback(
    (value: Translated | undefined | null) => {
      if (!value) return '';
      return value[locale] || value.fr || value.ar || '';
    },
    [locale],
  );

  const tpl = React.useCallback((template: string, values: Record<string, string | number>) => {
    return Object.entries(values).reduce(
      (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
      template,
    );
  }, []);

  const msg = React.useCallback(
    (key: string) => lookup(dictionaries[locale], key) ?? lookup(dictionaries.fr, key) ?? key,
    [locale],
  );

  const value = React.useMemo<I18nValue>(
    () => ({ locale, dir, t, setLocale, toggleLocale, pick, tpl, msg }),
    [locale, dir, t, setLocale, toggleLocale, pick, tpl, msg],
  );

  return (
    <I18nContext.Provider value={value}>
      <DocumentLangSync locale={locale} dir={dir} />
      {children}
    </I18nContext.Provider>
  );
}

/** Keeps <html lang> / <html dir> in sync after a client-side switch. */
function DocumentLangSync({ locale, dir }: { locale: Locale; dir: Direction }) {
  React.useEffect(() => {
    const root = document.documentElement;
    if (root.lang !== locale) root.lang = locale;
    if (root.dir !== dir) root.dir = dir;
  }, [locale, dir]);
  return null;
}

export function useI18n(): I18nValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

export type { Dictionary };
