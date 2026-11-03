/**
 * RAYANE AFFAIRE — single source of truth for brand identity.
 *
 * EVERY user-visible brand string, colour, and link lives here (or in
 * `lib/config.ts` for deployment-time values). Never hardcode the agency name
 * in a component: import from this module so a rebrand is a one-file change.
 */

export const BRAND = {
  /** Public trading name. */
  name: 'RAYANE AFFAIRE',
  /** Compact form used in tight spaces (mobile header, favicon text). */
  shortName: 'RAYANE',
  /** Two-letter monogram used by the logo mark. */
  monogram: 'RA',
  legalName: 'RAYANE AFFAIRE',
  tagline: {
    fr: 'Immobilier & véhicules — Béjaïa',
    ar: 'عقارات وسيارات — بجاية',
  },
  positioning: {
    fr: 'Location, vente et gestion immobilière, meublés de courte durée et location de véhicules dans la wilaya de Béjaïa.',
    ar: 'الكراء والبيع والتسيير العقاري، والشقق المفروشة للإقامة القصيرة وكراء السيارات في ولاية بجاية.',
  },
  /** Primary market. Verified against OSM administrative boundaries. */
  market: {
    wilaya: { fr: 'Wilaya de Béjaïa', ar: 'ولاية بجاية' },
    wilayaCode: '06',
    country: { fr: 'Algérie', ar: 'الجزائر' },
    countryCode: 'DZ',
    currency: 'DZD',
    locales: ['fr', 'ar'] as const,
    defaultLocale: 'fr' as const,
    rtlLocales: ['ar'] as const,
  },
  /**
   * Launched in 2024 — kept as a *content* value, not a statistic. It is shown
   * only in the About section, never in a numeric KPI block.
   */
  establishedYear: 2024,
} as const;

/** Design tokens mirrored in tailwind.config.ts and app/globals.css. */
export const THEME = {
  gold: '#D9A622',
  goldDeep: '#B98417',
  ink: '#1B1B1D',
  sand: '#F4F2EE',
  paper: '#FFFFFF',
} as const;

/** Navigation model — shared by header, footer and mobile drawer. */
export type NavItem = {
  href: string;
  labelKey: 'home' | 'properties' | 'vehicles' | 'map' | 'services' | 'about' | 'contact';
};

export const PRIMARY_NAV: NavItem[] = [
  { href: '/', labelKey: 'home' },
  { href: '/properties', labelKey: 'properties' },
  { href: '/vehicles', labelKey: 'vehicles' },
  { href: '/map', labelKey: 'map' },
  { href: '/services', labelKey: 'services' },
  { href: '/about', labelKey: 'about' },
  { href: '/contact', labelKey: 'contact' },
];
