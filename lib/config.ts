/**
 * RAYANE AFFAIRE — deployment-time configuration.
 *
 * Nothing secret belongs here: every value is either (a) exposed to the browser
 * via NEXT_PUBLIC_* or (b) read server-side from a non-public variable that is
 * never inlined into the client bundle. Secrets (DB keys, SMTP, object storage)
 * must be read inside server-only modules — see `lib/server/env.ts`.
 */

/** Digits only, international format, no leading "+" or spaces. */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';

/** Telephone shown in the header, footer and contact page. */
export const PHONE_NUMBER = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? '';

/** Public contact e-mail. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '';

/** Canonical base URL, used by sitemap, robots and OpenGraph metadata. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/**
 * Optional office address. Empty by default: the requirement explicitly forbids
 * inventing addresses, so the UI omits the block instead of showing a fake one.
 */
export const OFFICE_ADDRESS = process.env.NEXT_PUBLIC_OFFICE_ADDRESS ?? '';

/** Optional social profiles. Rendered only when configured. */
export const SOCIAL_LINKS = {
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? '',
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? '',
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL ?? '',
} as const;

/**
 * True while the owner has not supplied real business contact details.
 *
 * The requirement forbids silently shipping placeholder numbers as if they were
 * live. When this is true the UI shows an explicit, honest notice instead of a
 * clickable WhatsApp / call button, and the contact form still stores the lead.
 */
export const IS_PLACEHOLDER_CONTACT = !WHATSAPP_NUMBER || !PHONE_NUMBER;

/** OpenStreetMap tiles (public, no API key, attribution required — ODbL). */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Fallback framing, used only when a query returns no geo-located records. */
export const DEFAULT_MAP_CENTER = { lat: 36.7512, lng: 5.0567 } as const;
export const DEFAULT_MAP_ZOOM = 11;

/** Page sizes for public catalogues and admin tables. */
export const PAGE_SIZE_PUBLIC = 12;
export const PAGE_SIZE_ADMIN = 20;

/** Upload constraints — enforced server-side as well as in the UI. */
export const UPLOAD = {
  maxFileBytes: 5 * 1024 * 1024,
  maxFilesPerRequest: 8,
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const,
} as const;

/** Rate limiting windows (see lib/server/rate-limit.ts). */
export const RATE_LIMITS = {
  inquiry: { limit: 5, windowMs: 10 * 60 * 1000 },
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  upload: { limit: 40, windowMs: 10 * 60 * 1000 },
} as const;

export const STORAGE_KEYS = {
  locale: 'ra.locale',
  favorites: 'ra.favorites',
} as const;

/**
 * Rows in `settings`, seeded on migration.
 *
 * Keys are stable identifiers, never user-editable text: the admin UI can only
 * flip values the application knows about, so a typo cannot create a phantom
 * setting that silently does nothing.
 */
export const SETTINGS_KEYS = {
  /**
   * Whether the agency actually offers vehicle rental (own fleet or a partner).
   *
   * Default `true` preserves the pre-setting behaviour: the vehicle rental
   * surface stays visible until an operator deliberately turns it off. Sale-only
   * vehicle listings are unaffected either way.
   */
  vehicleRentalEnabled: 'vehicle_rental_enabled',
} as const;

/** Auth cookie names. */
export const AUTH_COOKIE = 'ra_session';
export const LOCALE_COOKIE = 'ra_locale';
/** Double-submit CSRF cookie paired with the session. */
export const CSRF_COOKIE = 'ra_csrf';
export const CSRF_HEADER = 'x-ra-csrf';
