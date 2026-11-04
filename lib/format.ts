import type { Locale, PriceUnit } from '@/types';

/**
 * Locale-aware formatting.
 *
 * Prices are integers in DZD. Arabic uses the `ar-DZ` locale with Latin digits
 * (`numberingSystem: 'latn'`) because Algerian Arabic content conventionally
 * keeps Western numerals, and Arabic-Indic digits render inconsistently in
 * form inputs.
 */

export function formatPrice(value: number, locale: Locale): string {
  // Grouping is deliberately pinned to the French-Algerian pattern for BOTH
  // locales: `ar-DZ` groups with a dot ("45.000"), which Algerian readers parse
  // as a decimal separator. Prices therefore always read "45 000 DA" /
  // "45 000 دج" with Latin digits, the convention used by Algerian property
  // portals. U+202F (narrow no-break space) is widened to a plain space for
  // consistent rendering in older mobile WebViews.
  const formatter = new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    maximumFractionDigits: 0,
    numberingSystem: 'latn',
  });
  const grouped = formatter.format(value).replace(/\u202f|\u00a0/g, ' ');
  return `${grouped} ${locale === 'ar' ? 'دج' : 'DA'}`;
}

export function formatSurface(value: number, locale: Locale): string {
  return locale === 'ar' ? `${value} م²` : `${value} m²`;
}

const UNIT_SUFFIX: Record<PriceUnit, { fr: string; ar: string }> = {
  month: { fr: '/ mois', ar: '/ شهر' },
  night: { fr: '/ nuit', ar: '/ ليلة' },
  total: { fr: '', ar: '' },
};

export function formatPriceWithUnit(value: number, unit: PriceUnit, locale: Locale): string {
  const suffix = UNIT_SUFFIX[unit][locale];
  return suffix ? `${formatPrice(value, locale)} ${suffix}` : formatPrice(value, locale);
}

export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(date);
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    numberingSystem: 'latn',
  }).format(value);
}

/** Human duration between two ISO dates, in whole days (inclusive). */
export function daysBetween(start: string, end: string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Business reference generator: RA-<commune code>-<sequence>. */
export function referenceFor(kind: 'P' | 'V' | 'R', sequence: number): string {
  const padded = String(sequence).padStart(4, '0');
  return kind === 'R' ? `RA-RES-${padded}` : `RA-${kind}-${padded}`;
}
