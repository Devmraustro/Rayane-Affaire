import { describe, expect, it } from 'vitest';
import { ar } from '@/lib/i18n/dictionaries/ar';
import { fr } from '@/lib/i18n/dictionaries/fr';
import { dirFor, isLocale, resolveLocale, bcp47 } from '@/lib/i18n/locale';

/**
 * i18n completeness.
 *
 * The TypeScript type of `ar` guarantees structural parity at compile time;
 * these tests additionally assert that no Arabic value is accidentally left in
 * French (a common copy-paste regression) and that every interactive label is
 * actually translated.
 */

type Node = Record<string, unknown>;

function flatten(node: Node, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value as Node, path));
    } else if (typeof value === 'string') {
      out[path] = value;
    }
  }
  return out;
}

const frFlat = flatten(fr as unknown as Node);
const arFlat = flatten(ar as unknown as Node);

/** Strings that are legitimately identical across locales. */
const INTENTIONALLY_SHARED = new Set([
  'common.french', // endonym: the French language is always labelled "Français"
  'common.arabic', // endonym: Arabic is always labelled "العربية" in both locales
]);

describe('dictionary parity', () => {
  it('exposes the same keys in both locales', () => {
    expect(Object.keys(arFlat).sort()).toEqual(Object.keys(frFlat).sort());
  });

  it('contains no empty values', () => {
    // `labels.priceUnit.total` is intentionally blank in neither locale now that
    // sale prices show "au total" / "إجمالاً"; every label must carry text.
    for (const [key, value] of Object.entries(arFlat)) {
      expect(value.length, `ar.${key} is empty`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(frFlat)) {
      expect(value.length, `fr.${key} is empty`).toBeGreaterThan(0);
    }
  });

  it('translates every Arabic string that differs in French', () => {
    const untranslated = Object.keys(frFlat).filter(
      (key) => !INTENTIONALLY_SHARED.has(key) && arFlat[key] === frFlat[key] && frFlat[key].length > 2,
    );
    expect(untranslated).toEqual([]);
  });

  it('uses Arabic script in the Arabic dictionary', () => {
    const arabicScript = /[\u0600-\u06FF]/;
    const critical = [
      'nav.home',
      'nav.properties',
      'nav.vehicles',
      'nav.map',
      'nav.contact',
      'properties.title',
      'vehicles.title',
      'contact.formTitle',
      'home.heroTitle',
      'form.phoneInvalid',
      'auth.loginTitle',
      'admin.nav.dashboard',
      'admin.nav.finances',
      'footer.rights',
    ];
    for (const key of critical) {
      expect(arabicScript.test(arFlat[key]), `ar.${key} has no Arabic script`).toBe(true);
    }
  });

  it('keeps the brand name consistent', () => {
    expect(fr.meta.defaultTitle).toContain('RAYANE AFFAIRE');
  });

  it('never mentions the reference brand', () => {
    const forbidden = /GW ?IMMOBILIER|GW Immobilier|GWI-|gw-immobilier/i;
    for (const [key, value] of [...Object.entries(frFlat), ...Object.entries(arFlat)]) {
      expect(forbidden.test(value), `${key} still references the reference brand`).toBe(false);
    }
  });

  it('has no French placeholder phone numbers', () => {
    const placeholder = /\+213\s?00\s?00\s?00\s?00/;
    for (const value of [...Object.values(frFlat), ...Object.values(arFlat)]) {
      expect(placeholder.test(value)).toBe(false);
    }
  });
});

describe('locale helpers', () => {
  it('maps locales to text direction', () => {
    expect(dirFor('fr')).toBe('ltr');
    expect(dirFor('ar')).toBe('rtl');
  });

  it('validates locale strings defensively', () => {
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('en')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });

  it('falls back to French for a missing or hostile cookie value', () => {
    expect(resolveLocale(undefined)).toBe('fr');
    expect(resolveLocale(null)).toBe('fr');
    expect(resolveLocale('de')).toBe('fr');
    expect(resolveLocale('ar')).toBe('ar');
  });

  it('produces locale-aware BCP-47 tags', () => {
    expect(bcp47('fr')).toBe('fr-DZ');
    expect(bcp47('ar')).toBe('ar-DZ');
  });
});

describe('label completeness', () => {
  it('covers every property category, transaction and furnishing state', () => {
    for (const locale of [fr, ar]) {
      for (const key of ['apartment', 'studio', 'villa', 'house', 'commercial', 'land', 'office'] as const) {
        expect(locale.labels.propertyCategory[key]).toBeTruthy();
      }
      for (const key of ['rent_annual', 'rent_short', 'sale', 'exchange'] as const) {
        expect(locale.labels.transaction[key]).toBeTruthy();
      }
      for (const key of ['furnished', 'unfurnished', 'semi_furnished'] as const) {
        expect(locale.labels.furnishing[key]).toBeTruthy();
      }
    }
  });

  it('covers every vehicle enum and availability state', () => {
    for (const locale of [fr, ar]) {
      for (const key of ['economy', 'sedan', 'suv', 'luxury', 'utility', 'van'] as const) {
        expect(locale.labels.vehicleCategory[key]).toBeTruthy();
      }
      for (const key of ['available', 'reserved', 'unavailable'] as const) {
        expect(locale.labels.availability[key]).toBeTruthy();
      }
      for (const key of ['exact', 'approximate', 'commune', 'pending'] as const) {
        expect(locale.labels.precision[key]).toBeTruthy();
      }
    }
  });

  it('covers every admin status and role label', () => {
    for (const locale of [fr, ar]) {
      for (const key of ['draft', 'published', 'archived'] as const) {
        expect(locale.labels.status[key]).toBeTruthy();
      }
      for (const key of ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'] as const) {
        expect(locale.labels.inquiryStatus[key]).toBeTruthy();
      }
      for (const key of ['owner', 'manager', 'editor'] as const) {
        expect(locale.labels.role[key]).toBeTruthy();
      }
    }
  });
});
