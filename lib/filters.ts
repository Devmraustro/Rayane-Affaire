import type {
  DealType,
  FuelType,
  FurnishingStatus,
  PropertyCategory,
  PropertyFilters,
  PropertySort,
  TransactionType,
  Transmission,
  VehicleCategory,
  VehicleFilters,
  VehicleSort,
} from '@/types';
import { PAGE_SIZE_PUBLIC } from '@/lib/config';

/**
 * IMPORTANT (module boundary)
 * This file is imported by Client Components (filter panels), so it must never
 * import `lib/db/**` — those modules pull in `node:fs`. The default filter
 * objects therefore live here, and the repositories import them from here.
 */

/**
 * URL <-> filter mapping.
 *
 * Filters live in the query string so a search result is shareable, bookmarkable
 * and server-renderable. Parsing is defensive: an attacker-supplied `?page=99999`
 * or an unknown enum value must never reach the database or crash the page.
 * Every function here is pure and unit-tested (tests/filters.test.ts).
 */

export type SearchParamsInput = Record<string, string | string[] | undefined>;

const PROPERTY_CATEGORIES: PropertyCategory[] = [
  'apartment', 'studio', 'villa', 'house', 'commercial', 'land', 'office',
];
const TRANSACTIONS: TransactionType[] = ['rent_annual', 'rent_short', 'sale', 'exchange'];
const FURNISHING: FurnishingStatus[] = ['furnished', 'unfurnished', 'semi_furnished'];
const PROPERTY_SORTS: PropertySort[] = ['newest', 'price-asc', 'price-desc', 'surface-desc', 'relevance'];

const VEHICLE_CATEGORIES: VehicleCategory[] = ['economy', 'sedan', 'suv', 'luxury', 'utility', 'van'];
const DEAL_TYPES: DealType[] = ['rent', 'sale', 'both'];
const TRANSMISSIONS: Transmission[] = ['manual', 'automatic'];
const FUELS: FuelType[] = ['petrol', 'diesel', 'hybrid', 'electric', 'lpg'];
const VEHICLE_SORTS: VehicleSort[] = ['newest', 'price-asc', 'price-desc', 'year-desc', 'relevance'];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function all(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** Positive integer or null. Rejects NaN, negatives, Infinity and junk. */
export function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = first(value);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

export function parseEnumList<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T[] {
  const seen = new Set<T>();
  for (const raw of all(value)) {
    // Support both `?c=a&c=b` and `?c=a,b`.
    for (const part of raw.split(',')) {
      const trimmed = part.trim() as T;
      if (allowed.includes(trimmed)) seen.add(trimmed);
    }
  }
  return [...seen];
}

function parseEnum<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | null {
  const raw = first(value);
  if (!raw) return null;
  return allowed.includes(raw as T) ? (raw as T) : null;
}

function parseBoolean(value: string | string[] | undefined): boolean {
  const raw = first(value);
  return raw === '1' || raw === 'true' || raw === 'on';
}

export function defaultPropertyFilters(): PropertyFilters {
  return {
    query: '',
    communes: [],
    categories: [],
    transactions: [],
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    surfaceMin: null,
    furnishing: 'all',
    availableOnly: false,
    withCoordinatesOnly: false,
    includeDemo: true,
    page: 1,
    pageSize: PAGE_SIZE_PUBLIC,
    sort: 'newest',
  };
}

export function defaultVehicleFilters(): VehicleFilters {
  return {
    query: '',
    communes: [],
    categories: [],
    dealTypes: [],
    minPrice: null,
    maxPrice: null,
    transmission: 'all',
    fuel: 'all',
    seats: null,
    availableOnly: false,
    includeDemo: true,
    page: 1,
    pageSize: PAGE_SIZE_PUBLIC,
    sort: 'newest',
  };
}

export function parsePropertySearchParams(params: SearchParamsInput): PropertyFilters {
  const base = defaultPropertyFilters();
  return {
    ...base,
    query: (first(params.q) ?? '').slice(0, 120),
    communes: parseCommuneList(params.commune),
    categories: parseEnumList(params.category, PROPERTY_CATEGORIES),
    transactions: parseEnumList(params.transaction, TRANSACTIONS),
    minPrice: parsePositiveInt(params.minPrice),
    maxPrice: parsePositiveInt(params.maxPrice),
    bedrooms: parsePositiveInt(params.bedrooms),
    surfaceMin: parsePositiveInt(params.surfaceMin),
    furnishing: parseEnum(params.furnishing, FURNISHING) ?? 'all',
    availableOnly: parseBoolean(params.available),
    withCoordinatesOnly: parseBoolean(params.mapped),
    page: Math.min(1000, Math.max(1, parsePositiveInt(params.page) ?? 1)),
    pageSize: PAGE_SIZE_PUBLIC,
    sort: parseEnum(params.sort, PROPERTY_SORTS) ?? 'newest',
  };
}

/** Commune slugs are free-form strings validated against the database later. */
function parseCommuneList(value: string | string[] | undefined): string[] {
  const out = new Set<string>();
  for (const raw of all(value)) {
    for (const part of raw.split(',')) {
      const slug = part.trim().toLowerCase();
      if (/^[a-z0-9-]{2,60}$/.test(slug)) out.add(slug);
    }
  }
  return [...out].slice(0, 20);
}

export function parseVehicleSearchParams(params: SearchParamsInput): VehicleFilters {
  const base = defaultVehicleFilters();
  return {
    ...base,
    query: (first(params.q) ?? '').slice(0, 120),
    communes: parseCommuneList(params.commune),
    categories: parseEnumList(params.category, VEHICLE_CATEGORIES),
    dealTypes: parseEnumList(params.deal, DEAL_TYPES),
    minPrice: parsePositiveInt(params.minPrice),
    maxPrice: parsePositiveInt(params.maxPrice),
    transmission: parseEnum(params.transmission, TRANSMISSIONS) ?? 'all',
    fuel: parseEnum(params.fuel, FUELS) ?? 'all',
    seats: parsePositiveInt(params.seats),
    availableOnly: parseBoolean(params.available),
    page: Math.min(1000, Math.max(1, parsePositiveInt(params.page) ?? 1)),
    pageSize: PAGE_SIZE_PUBLIC,
    sort: parseEnum(params.sort, VEHICLE_SORTS) ?? 'newest',
  };
}

/** Serialises a filter object back into a query string (drops defaults). */
export function toPropertyQuery(filters: Partial<PropertyFilters>): string {
  const search = new URLSearchParams();
  if (filters.query) search.set('q', filters.query);
  if (filters.communes?.length) search.set('commune', filters.communes.join(','));
  if (filters.categories?.length) search.set('category', filters.categories.join(','));
  if (filters.transactions?.length) search.set('transaction', filters.transactions.join(','));
  if (filters.minPrice != null) search.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice != null) search.set('maxPrice', String(filters.maxPrice));
  if (filters.bedrooms != null) search.set('bedrooms', String(filters.bedrooms));
  if (filters.surfaceMin != null) search.set('surfaceMin', String(filters.surfaceMin));
  if (filters.furnishing && filters.furnishing !== 'all') search.set('furnishing', filters.furnishing);
  if (filters.availableOnly) search.set('available', '1');
  if (filters.page && filters.page > 1) search.set('page', String(filters.page));
  if (filters.sort && filters.sort !== 'newest') search.set('sort', filters.sort);
  return search.toString();
}

export function toVehicleQuery(filters: Partial<VehicleFilters>): string {
  const search = new URLSearchParams();
  if (filters.query) search.set('q', filters.query);
  if (filters.communes?.length) search.set('commune', filters.communes.join(','));
  if (filters.categories?.length) search.set('category', filters.categories.join(','));
  if (filters.dealTypes?.length) search.set('deal', filters.dealTypes.join(','));
  if (filters.minPrice != null) search.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice != null) search.set('maxPrice', String(filters.maxPrice));
  if (filters.transmission && filters.transmission !== 'all') search.set('transmission', filters.transmission);
  if (filters.fuel && filters.fuel !== 'all') search.set('fuel', filters.fuel);
  if (filters.seats != null) search.set('seats', String(filters.seats));
  if (filters.availableOnly) search.set('available', '1');
  if (filters.page && filters.page > 1) search.set('page', String(filters.page));
  if (filters.sort && filters.sort !== 'newest') search.set('sort', filters.sort);
  return search.toString();
}

/** Count of active filters, drives the "Filtres (3)" affordance on mobile. */
export function countActiveFilters(filters: PropertyFilters | VehicleFilters): number {
  let n = 0;
  if (filters.query) n += 1;
  if (filters.communes.length) n += 1;
  if (filters.categories.length) n += 1;
  const withTx = filters as PropertyFilters;
  if (withTx.transactions?.length) n += 1;
  if (filters.minPrice != null) n += 1;
  if (filters.maxPrice != null) n += 1;
  if (filters.availableOnly) n += 1;
  const withBeds = filters as PropertyFilters;
  if (withBeds.bedrooms != null) n += 1;
  if (withBeds.furnishing && withBeds.furnishing !== 'all') n += 1;
  const withDeal = filters as VehicleFilters;
  if (withDeal.dealTypes?.length) n += 1;
  if (withDeal.transmission && withDeal.transmission !== 'all') n += 1;
  if (withDeal.fuel && withDeal.fuel !== 'all') n += 1;
  return n;
}
