import { describe, expect, it } from 'vitest';
import { daysBetween, formatPrice, formatDate, formatSurface, referenceFor } from '@/lib/format';
import { slugify, uniqueSlug } from '@/lib/slug';

describe('price formatting', () => {
  it('formats DZD with the right currency word per locale', () => {
    expect(formatPrice(45000, 'fr')).toBe('45 000 DA');
    expect(formatPrice(45000, 'ar')).toBe('45 000 دج');
  });

  it('uses Latin digits in Arabic (Algerian convention)', () => {
    const arabic = formatPrice(1250000, 'ar');
    expect(/[0-9]/.test(arabic)).toBe(true);
    expect(/[\u0660-\u0669]/.test(arabic)).toBe(false);
  });

  it('never emits decimals for whole dinars', () => {
    expect(formatPrice(1000, 'fr')).not.toContain(',00');
  });

  it('formats surfaces per locale', () => {
    expect(formatSurface(82, 'fr')).toBe('82 m²');
    expect(formatSurface(82, 'ar')).toBe('82 م²');
  });
});

describe('date formatting', () => {
  it('formats a valid ISO date', () => {
    expect(formatDate('2024-09-12T10:00:00.000Z', 'fr')).toContain('2024');
  });

  it('returns an em dash for missing or invalid dates without throwing', () => {
    expect(formatDate(null, 'fr')).toBe('—');
    expect(formatDate(undefined, 'ar')).toBe('—');
    expect(formatDate('not-a-date', 'fr')).toBe('—');
  });
});

describe('duration helper', () => {
  it('computes inclusive day counts', () => {
    expect(daysBetween('2024-09-01', '2024-09-05')).toBe(4);
    expect(daysBetween('2024-09-01', '2024-09-01')).toBe(0);
    expect(daysBetween('2024-09-05', '2024-09-01')).toBe(0);
    expect(daysBetween('bad', '2024-09-01')).toBe(0);
  });
});

describe('business references', () => {
  it('pads sequence numbers', () => {
    expect(referenceFor('P', 7)).toBe('RA-P-0007');
    expect(referenceFor('V', 1234)).toBe('RA-V-1234');
    expect(referenceFor('R', 3)).toBe('RA-RES-0003');
  });
});

describe('slug generation', () => {
  it('folds accents and produces readable French slugs', () => {
    expect(slugify('Appartement F3 Béjaïa centre')).toBe('appartement-f3-bejaia-centre');
    expect(slugify('Villa  à   Tichy ')).toBe('villa-a-tichy');
  });

  it('preserves Arabic characters', () => {
    expect(slugify('شقة مفروشة')).toContain('شقة');
  });

  it('never returns an empty slug', () => {
    expect(slugify('!!!')).toBe('');
    expect(uniqueSlug('!!!', () => false)).toBe('annonce');
  });

  it('appends a numeric suffix on collision', () => {
    const taken = new Set(['villa-tichy', 'villa-tichy-2']);
    expect(uniqueSlug('Villa Tichy', (candidate) => taken.has(candidate))).toBe('villa-tichy-3');
  });

  it('strips path traversal characters', () => {
    const slug = slugify('../../etc/passwd');
    expect(slug).not.toContain('/');
    expect(slug).not.toContain('..');
  });
});
