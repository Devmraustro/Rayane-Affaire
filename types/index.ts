/**
 * RAYANE AFFAIRE — domain models.
 *
 * These types are the single source of truth for the whole application: the
 * SQLite row mappers in `lib/db/mappers.ts` produce them, the REST API in
 * `app/api/**` serialises them, and every React component consumes them.
 * Transport-agnostic on purpose, so the storage engine can be swapped without
 * touching the UI.
 */

export type Locale = 'fr' | 'ar';
export type Direction = 'ltr' | 'rtl';

/** A string translated into every supported locale. */
export type Translated = Record<Locale, string>;

/* -------------------------------------------------------------------------- */
/* Geography                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * How precise a marker coordinate is. Surfaced in the UI, never hidden:
 * the platform must not imply a verified address when there is none.
 *
 * - `exact`       surveyed/geocoded street-level position, owner-confirmed
 * - `approximate` geocoded neighbourhood, offset applied for privacy
 * - `commune`     commune-centroid only (OSM administrative boundary)
 * - `pending`     no coordinate yet — record is excluded from the map
 */
export type CoordinatePrecision = 'exact' | 'approximate' | 'commune' | 'pending';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Commune {
  id: string;
  slug: string;
  name: Translated;
  wilaya: Translated;
  wilayaCode: string;
  /** Commune centroid from the OSM administrative relation. */
  center: GeoPoint;
  defaultZoom: number;
  /** OSM relation id — the verifiable provenance of `center`. */
  osmRelationId: string | null;
  active: boolean;
}

/* -------------------------------------------------------------------------- */
/* Listings — shared enums                                                     */
/* -------------------------------------------------------------------------- */

export type ListingStatus = 'draft' | 'published' | 'archived';

export type PropertyCategory =
  | 'apartment'
  | 'studio'
  | 'villa'
  | 'house'
  | 'commercial'
  | 'land'
  | 'office';

export type TransactionType = 'rent_annual' | 'rent_short' | 'sale' | 'exchange';

export type PriceUnit = 'month' | 'night' | 'total';

export type FurnishingStatus = 'furnished' | 'unfurnished' | 'semi_furnished';

export type AvailabilityStatus = 'available' | 'reserved' | 'unavailable';

export type VehicleCategory =
  | 'economy'
  | 'sedan'
  | 'suv'
  | 'luxury'
  | 'utility'
  | 'van';

export type Transmission = 'manual' | 'automatic';

export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg';

export type DealType = 'rent' | 'sale' | 'both';

export interface MediaItem {
  id: string;
  url: string;
  /** Translated alt text — required for accessibility on every image. */
  alt: Translated;
  width: number | null;
  height: number | null;
  sortOrder: number;
  /** Attribution when the photo is externally licensed (not client-supplied). */
  credit: string | null;
  /** Direct source URL for externally licensed photography. */
  sourceUrl: string | null;
  license: string | null;
}

/* -------------------------------------------------------------------------- */
/* Properties                                                                  */
/* -------------------------------------------------------------------------- */

export interface Property {
  id: string;
  slug: string;
  /** Human friendly business reference, e.g. "RA-0600-0042". */
  reference: string;
  title: Translated;
  description: Translated;
  category: PropertyCategory;
  transaction: TransactionType;
  price: number;
  priceUnit: PriceUnit;
  currency: 'DZD';
  /** True only for records seeded as demonstration content. */
  isDemo: boolean;
  commune: Commune;
  address: Translated;
  coordinates: GeoPoint | null;
  coordinatePrecision: CoordinatePrecision;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  floor: number | null;
  furnishing: FurnishingStatus;
  amenities: string[];
  availabilityStatus: AvailabilityStatus;
  availableFrom: string | null;
  featured: boolean;
  withVideo: boolean;
  videoUrl: string | null;
  status: ListingStatus;
  media: MediaItem[];
  createdAt: string;
  updatedAt: string;
}

/** List projection — avoids shipping descriptions/photos in catalogue pages. */
export interface PropertySummary {
  id: string;
  slug: string;
  reference: string;
  title: Translated;
  category: PropertyCategory;
  transaction: TransactionType;
  price: number;
  priceUnit: PriceUnit;
  currency: 'DZD';
  isDemo: boolean;
  commune: Pick<Commune, 'id' | 'slug' | 'name'>;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  furnishing: FurnishingStatus;
  availabilityStatus: AvailabilityStatus;
  featured: boolean;
  withVideo: boolean;
  coordinatePrecision: CoordinatePrecision;
  thumbnail: MediaItem | null;
  createdAt: string;
}

export interface PropertyMapPoint {
  id: string;
  slug: string;
  reference: string;
  title: Translated;
  price: number;
  priceUnit: PriceUnit;
  transaction: TransactionType;
  category: PropertyCategory;
  coordinatePrecision: CoordinatePrecision;
  commune: Pick<Commune, 'slug' | 'name'>;
  thumbnailUrl: string | null;
  lat: number;
  lng: number;
}

/* -------------------------------------------------------------------------- */
/* Vehicles                                                                    */
/* -------------------------------------------------------------------------- */

export interface Vehicle {
  id: string;
  slug: string;
  reference: string;
  title: Translated;
  description: Translated;
  brand: string;
  model: string;
  year: number;
  category: VehicleCategory;
  transmission: Transmission;
  fuel: FuelType;
  seats: number;
  doors: number;
  dealType: DealType;
  /** Rental price per day, when rentable. */
  dailyPrice: number | null;
  /** Sale price, when for sale. */
  salePrice: number | null;
  currency: 'DZD';
  isDemo: boolean;
  registrationYearVerified: boolean;
  commune: Commune;
  coordinates: GeoPoint | null;
  coordinatePrecision: CoordinatePrecision;
  mileageKm: number | null;
  features: string[];
  availabilityStatus: AvailabilityStatus;
  featured: boolean;
  status: ListingStatus;
  media: MediaItem[];
  createdAt: string;
  updatedAt: string;
}

export interface VehicleSummary {
  id: string;
  slug: string;
  reference: string;
  title: Translated;
  brand: string;
  model: string;
  year: number;
  category: VehicleCategory;
  transmission: Transmission;
  fuel: FuelType;
  seats: number;
  dealType: DealType;
  dailyPrice: number | null;
  salePrice: number | null;
  currency: 'DZD';
  isDemo: boolean;
  commune: Pick<Commune, 'id' | 'slug' | 'name'>;
  availabilityStatus: AvailabilityStatus;
  featured: boolean;
  thumbnail: MediaItem | null;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Editorial places                                                           */
/* -------------------------------------------------------------------------- */

export type PlaceCategory =
  | 'landmark'
  | 'restaurant'
  | 'cafe'
  | 'hotel'
  | 'shopping'
  | 'service'
  | 'culture'
  | 'nature'
  | 'beach'
  | 'other';
export type PlaceCoordinatePrecision = 'exact' | 'approximate' | 'pending';
export type LocationVerificationStatus = 'missing' | 'unverified' | 'verified';

export interface Place {
  id: string;
  slug: string;
  reference: string;
  name: Translated;
  description: Translated;
  address: Translated;
  commune: Commune;
  category: PlaceCategory;
  /** Null in every public projection until an editor verifies the location. */
  coordinates: GeoPoint | null;
  coordinatePrecision: PlaceCoordinatePrecision;
  locationStatus: LocationVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  status: ListingStatus;
  isDemo: boolean;
  media: MediaItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaceFilters {
  query: string;
  wilayaCode: string;
  commune: string;
  category: 'all' | PlaceCategory;
  includeDemo: boolean;
  page: number;
  pageSize: number;
}

/* -------------------------------------------------------------------------- */
/* CRM                                                                         */
/* -------------------------------------------------------------------------- */

export type InquiryType = 'property' | 'vehicle' | 'general' | 'reservation';
export type InquiryStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'spam';
export type ContactChannel = 'phone' | 'whatsapp' | 'email';

export interface Inquiry {
  id: string;
  locale: Locale;
  type: InquiryType;
  status: InquiryStatus;
  fullName: string;
  phone: string;
  email: string | null;
  message: string;
  propertyId: string | null;
  vehicleId: string | null;
  propertyReference: string | null;
  vehicleReference: string | null;
  preferredChannel: ContactChannel;
  preferredDate: string | null;
  /** Hash of the submitting client, used for abuse detection only. */
  sourceIpHash: string | null;
  userAgent: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CustomerType = 'individual' | 'company';

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  type: CustomerType;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  reference: string;
  kind: 'property' | 'vehicle';
  propertyId: string | null;
  vehicleId: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string;
  itemTitle: Translated;
  itemReference: string;
  startDate: string;
  endDate: string;
  /** Agreed amount in DZD, derived from the listing price × duration. */
  amount: number;
  deposit: number;
  status: ReservationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Filters & sorting                                                           */
/* -------------------------------------------------------------------------- */

export type PropertySort = 'newest' | 'price-asc' | 'price-desc' | 'surface-desc' | 'relevance';
export type VehicleSort = 'newest' | 'price-asc' | 'price-desc' | 'year-desc' | 'relevance';

export interface PropertyFilters {
  query: string;
  communes: string[];
  categories: PropertyCategory[];
  transactions: TransactionType[];
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  surfaceMin: number | null;
  furnishing: 'all' | FurnishingStatus;
  availableOnly: boolean;
  withCoordinatesOnly: boolean;
  includeDemo: boolean;
  page: number;
  pageSize: number;
  sort: PropertySort;
}

export interface VehicleFilters {
  query: string;
  communes: string[];
  categories: VehicleCategory[];
  dealTypes: DealType[];
  minPrice: number | null;
  maxPrice: number | null;
  transmission: 'all' | Transmission;
  fuel: 'all' | FuelType;
  seats: number | null;
  availableOnly: boolean;
  includeDemo: boolean;
  page: number;
  pageSize: number;
  sort: VehicleSort;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export type AdminRole = 'owner' | 'manager' | 'editor';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  active: boolean;
  mustChangePassword: boolean;
  notificationEmail: string | null;
  notifyNewInquiry: boolean;
  notifyReservation: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* API envelope                                                                */
/* -------------------------------------------------------------------------- */

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    /** Field-level validation errors, keyed by field path. */
    fields?: Record<string, string>;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
