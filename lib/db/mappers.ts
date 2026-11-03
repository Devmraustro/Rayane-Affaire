import '@/lib/server/guard';
import type {
  Commune,
  MediaItem,
  Property,
  PropertySummary,
} from '@/types';

/** Raw row shapes as returned by `node:sqlite` (bilingual column pairs). */
export interface CommuneRow {
  id: string;
  slug: string;
  name_fr: string;
  name_ar: string;
  wilaya_fr: string;
  wilaya_ar: string;
  wilaya_code: string;
  lat: number;
  lng: number;
  default_zoom: number;
  osm_relation_id: string | null;
  active: number;
}

export interface MediaRow {
  id: string;
  entity_type: 'property' | 'vehicle';
  entity_id: string;
  url: string;
  alt_fr: string;
  alt_ar: string;
  width: number | null;
  height: number | null;
  sort_order: number;
  credit: string | null;
  source_url: string | null;
  license: string | null;
}

export interface PropertyRow {
  id: string;
  slug: string;
  reference: string;
  title_fr: string;
  title_ar: string;
  description_fr: string;
  description_ar: string;
  category: string;
  transaction_type: string;
  price: number;
  price_unit: string;
  currency: string;
  commune_id: string;
  address_fr: string;
  address_ar: string;
  lat: number | null;
  lng: number | null;
  coordinate_precision: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  floor: number | null;
  furnishing: string;
  amenities: string;
  availability_status: string;
  available_from: string | null;
  featured: number;
  video_url: string | null;
  status: string;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleRow {
  id: string;
  slug: string;
  reference: string;
  title_fr: string;
  title_ar: string;
  description_fr: string;
  description_ar: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  transmission: string;
  fuel: string;
  seats: number;
  doors: number;
  deal_type: string;
  daily_price: number | null;
  sale_price: number | null;
  currency: string;
  commune_id: string;
  lat: number | null;
  lng: number | null;
  coordinate_precision: string;
  mileage_km: number | null;
  features: string;
  availability_status: string;
  featured: number;
  status: string;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

/** JSON array columns are stored as TEXT; a corrupt value must not crash a page. */
export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function rowToCommune(row: CommuneRow): Commune {
  return {
    id: row.id,
    slug: row.slug,
    name: { fr: row.name_fr, ar: row.name_ar },
    wilaya: { fr: row.wilaya_fr, ar: row.wilaya_ar },
    wilayaCode: row.wilaya_code,
    center: { lat: row.lat, lng: row.lng },
    defaultZoom: row.default_zoom,
    osmRelationId: row.osm_relation_id,
    active: row.active === 1,
  };
}

export function rowToMedia(row: MediaRow): MediaItem {
  return {
    id: row.id,
    url: row.url,
    alt: { fr: row.alt_fr, ar: row.alt_ar },
    width: row.width,
    height: row.height,
    sortOrder: row.sort_order,
    credit: row.credit,
    sourceUrl: row.source_url,
    license: row.license,
  };
}

export function rowToProperty(row: PropertyRow, commune: CommuneRow | undefined, media: MediaItem[]): Property {
  if (!commune) throw new Error(`Property ${row.id} references a missing commune`);
  return {
    id: row.id,
    slug: row.slug,
    reference: row.reference,
    title: { fr: row.title_fr, ar: row.title_ar },
    description: { fr: row.description_fr, ar: row.description_ar },
    category: row.category as Property['category'],
    transaction: row.transaction_type as Property['transaction'],
    price: row.price,
    priceUnit: row.price_unit as Property['priceUnit'],
    currency: 'DZD',
    isDemo: row.is_demo === 1,
    commune: rowToCommune(commune),
    address: { fr: row.address_fr, ar: row.address_ar },
    coordinates:
      row.lat === null || row.lng === null ? null : { lat: row.lat, lng: row.lng },
    coordinatePrecision: row.coordinate_precision as Property['coordinatePrecision'],
    surface: row.surface,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    floor: row.floor,
    furnishing: row.furnishing as Property['furnishing'],
    amenities: parseJsonArray(row.amenities),
    availabilityStatus: row.availability_status as Property['availabilityStatus'],
    availableFrom: row.available_from,
    featured: row.featured === 1,
    withVideo: Boolean(row.video_url),
    videoUrl: row.video_url,
    status: row.status as Property['status'],
    media,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPropertySummary(
  row: PropertyRow,
  commune: Pick<Commune, 'id' | 'slug' | 'name'>,
  thumbnail: MediaItem | null,
): PropertySummary {
  return {
    id: row.id,
    slug: row.slug,
    reference: row.reference,
    title: { fr: row.title_fr, ar: row.title_ar },
    category: row.category as PropertySummary['category'],
    transaction: row.transaction_type as PropertySummary['transaction'],
    price: row.price,
    priceUnit: row.price_unit as PropertySummary['priceUnit'],
    currency: 'DZD',
    isDemo: row.is_demo === 1,
    commune,
    surface: row.surface,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    furnishing: row.furnishing as PropertySummary['furnishing'],
    availabilityStatus: row.availability_status as PropertySummary['availabilityStatus'],
    featured: row.featured === 1,
    withVideo: Boolean(row.video_url),
    coordinatePrecision: row.coordinate_precision as PropertySummary['coordinatePrecision'],
    thumbnail,
    createdAt: row.created_at,
  };
}
