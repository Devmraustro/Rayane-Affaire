import { describe, expect, it } from 'vitest';
import {
  parsePropertySearchParams,
  parseVehicleSearchParams,
  toPropertyQuery,
  toVehicleQuery,
  countActiveFilters,
  parsePositiveInt,
} from '@/lib/filters';
import { defaultPropertyFilters, defaultVehicleFilters } from '@/lib/filters';

describe('parsePositiveInt', () => {
  it('parses valid values and rejects junk', () => {
    expect(parsePositiveInt('12')).toBe(12);
    expect(parsePositiveInt('0')).toBe(0);
    expect(parsePositiveInt('-5')).toBeNull();
    expect(parsePositiveInt('abc')).toBeNull();
    expect(parsePositiveInt('')).toBeNull();
    expect(parsePositiveInt(undefined)).toBeNull();
    expect(parsePositiveInt('Infinity')).toBeNull();
  });
});

describe('parsePropertySearchParams', () => {
  it('returns defaults for an empty query string', () => {
    const filters = parsePropertySearchParams({});
    expect(filters).toEqual(defaultPropertyFilters());
  });

  it('parses a realistic search', () => {
    const filters = parsePropertySearchParams({
      q: 'vue mer',
      commune: 'bejaia,tichy',
      category: 'villa',
      transaction: 'rent_short',
      minPrice: '5000',
      maxPrice: '20000',
      bedrooms: '3',
      furnishing: 'furnished',
      available: '1',
      sort: 'price-asc',
    });
    expect(filters.query).toBe('vue mer');
    expect(filters.communes).toEqual(['bejaia', 'tichy']);
    expect(filters.categories).toEqual(['villa']);
    expect(filters.transactions).toEqual(['rent_short']);
    expect(filters.minPrice).toBe(5000);
    expect(filters.maxPrice).toBe(20000);
    expect(filters.bedrooms).toBe(3);
    expect(filters.furnishing).toBe('furnished');
    expect(filters.availableOnly).toBe(true);
    expect(filters.sort).toBe('price-asc');
  });

  it('drops unknown enum values instead of throwing', () => {
    const filters = parsePropertySearchParams({
      category: 'castle',
      transaction: 'giveaway',
      furnishing: 'gold-plated',
      sort: 'random',
    });
    expect(filters.categories).toEqual([]);
    expect(filters.transactions).toEqual([]);
    expect(filters.furnishing).toBe('all');
    expect(filters.sort).toBe('newest');
  });

  it('clamps the page and rejects a hostile commune slug', () => {
    expect(parsePropertySearchParams({ page: '999999' }).page).toBe(1000);
    const filters = parsePropertySearchParams({ commune: '../../etc/passwd' });
    expect(filters.communes).toEqual([]);
  });

  it('caps the free-text query length', () => {
    const filters = parsePropertySearchParams({ q: 'x'.repeat(500) });
    expect(filters.query.length).toBe(120);
  });
});

describe('parseVehicleSearchParams', () => {
  it('returns defaults', () => {
    expect(parseVehicleSearchParams({})).toEqual(defaultVehicleFilters());
  });

  it('parses deal type, transmission, fuel and seats', () => {
    const filters = parseVehicleSearchParams({
      deal: 'rent',
      transmission: 'automatic',
      fuel: 'diesel',
      seats: '7',
    });
    expect(filters.dealTypes).toEqual(['rent']);
    expect(filters.transmission).toBe('automatic');
    expect(filters.fuel).toBe('diesel');
    expect(filters.seats).toBe(7);
  });
});

describe('query serialisation', () => {
  it('round-trips a property filter set', () => {
    const query = toPropertyQuery({
      query: 'vue mer',
      communes: ['bejaia'],
      categories: ['villa'],
      minPrice: 1000,
      maxPrice: 9000,
      availableOnly: true,
      page: 2,
      sort: 'price-desc',
    });
    const parsed = parsePropertySearchParams(
      Object.fromEntries(new URLSearchParams(query).entries()),
    );
    expect(parsed.query).toBe('vue mer');
    expect(parsed.communes).toEqual(['bejaia']);
    expect(parsed.categories).toEqual(['villa']);
    expect(parsed.minPrice).toBe(1000);
    expect(parsed.availableOnly).toBe(true);
    expect(parsed.page).toBe(2);
    expect(parsed.sort).toBe('price-desc');
  });

  it('omits defaults from the query string', () => {
    expect(toPropertyQuery({})).toBe('');
    expect(toVehicleQuery({ sort: 'newest', page: 1 })).toBe('');
  });
});

describe('countActiveFilters', () => {
  it('counts only non-default values', () => {
    expect(countActiveFilters(defaultPropertyFilters())).toBe(0);
    expect(
      countActiveFilters({
        ...defaultPropertyFilters(),
        query: 'x',
        communes: ['bejaia'],
        availableOnly: true,
      }),
    ).toBe(3);
  });
});
