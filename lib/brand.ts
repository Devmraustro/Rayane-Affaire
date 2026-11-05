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
  /**
   * Positioning used when the agency does not rent vehicles.
   *
   * A tagline is marketing copy, not navigation: leaving the rental promise in the
   * homepage heading while the rental section is switched off would advertise a
   * service the agency does not provide. Vehicle *sales* are still mentioned, since
   * they remain part of the offer.
   */
  positioningWithoutRental: {
    fr: 'Location, vente et gestion immobilière, meublés de courte durée et vente de véhicules dans la wilaya de Béjaïa.',
    ar: 'الكراء والبيع والتسيير العقاري، والشقق المفروشة للإقامة القصيرة وبيع السيارات في ولاية بجاية.',
  },
  /**
   * Positioning when no vehicle is offered publicly at all — the client's current
   * policy. The agency presents itself as what it publicly is: a real-estate
   * agency. No vehicle word survives, in either language.
   */
  positioningRealEstate: {
    fr: 'Vente et location immobilière, meublés de courte durée et gestion locative dans la wilaya de Béjaïa.',
    ar: 'البيع والكراء العقاري، والشقق المفروشة للإقامة القصيرة والتسيير الإيجاري في ولاية بجاية.',
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
  /** No founding year is published until the client confirms one in writing. */
  establishedYear: null as number | null,
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
  labelKey: 'home' | 'properties' | 'vehicles' | 'vehicleSales' | 'map' | 'services' | 'about' | 'contact';
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

/**
 * Navigation for the current vehicle policy.
 *
 * When the vehicle section is hidden (the client's standing decision) the entry
 * is removed outright — there is no public page for it to lead to.
 *
 * When it is public, the rental flag refines the label:
 *
 *   * if sale inventory exists, `/vehicles` stays in the menu but is relabelled
 *     "Véhicules à vendre" / "سيارات للبيع" — the catalogue is still a catalogue,
 *     and hiding it would bury sale stock the agency is trying to sell;
 *   * if there is no sale inventory at all, the entry is dropped, because a link
 *     to an empty catalogue is a dead end.
 *
 * The caller decides "sale inventory exists" (see `countPublicSaleVehicles`), so
 * this function stays pure and testable.
 */
export function primaryNavFor(options: {
  /** Master switch — when explicitly false the entry disappears entirely. */
  vehiclePublicVisible?: boolean;
  rentalEnabled: boolean;
  hasSaleInventory?: boolean;
}): NavItem[] {
  // Hidden section ⇒ no entry, whatever the rental flag says.
  if (options.vehiclePublicVisible === false) {
    return PRIMARY_NAV.filter((item) => item.labelKey !== 'vehicles');
  }
  if (options.rentalEnabled) return PRIMARY_NAV;
  // Default to keeping the entry: a caller that forgets the flag should not
  // silently hide the sale catalogue.
  if (options.hasSaleInventory === false) {
    return PRIMARY_NAV.filter((item) => item.labelKey !== 'vehicles');
  }
  return PRIMARY_NAV.map((item) =>
    item.labelKey === 'vehicles' ? { ...item, labelKey: 'vehicleSales' as const } : item,
  );
}
