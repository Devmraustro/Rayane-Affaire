/**
 * Setting definitions shared by the server repository and the admin UI.
 *
 * This module is deliberately free of any database import so it can be pulled
 * into a Client Component (the settings form) without dragging `node:sqlite`
 * into the browser bundle — the failure mode that previously broke every route
 * in this project. The repository lives in `lib/db/settings.ts`.
 */
import { SETTINGS_KEYS } from '@/lib/config';

export type SettingKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export interface SettingDefinition {
  key: SettingKey;
  /** Value used when the row is missing, so a fresh database behaves sanely. */
  defaultValue: boolean;
}

/**
 * Vehicle rental visibility.
 *
 * `true` is the historical behaviour (the rental surface is shown), so deploying
 * this setting does not change an existing site on its own. An operator must
 * turn it off explicitly once the agency confirms it has no rental partner.
 */
export const VEHICLE_RENTAL_DEFAULT = true;

/**
 * Whether the vehicle section is public at all.
 *
 * `false` is the client's explicit, standing decision: vehicles are managed
 * internally but are not part of the public offer. This is the *master* switch —
 * the rental flag below only refines a section that is already visible, so it can
 * never re-expose one that is hidden.
 */
export const VEHICLE_PUBLIC_VISIBLE_DEFAULT = false;

export const SETTING_DEFINITIONS: Record<'vehiclePublicVisible' | 'vehicleRental', SettingDefinition> = {
  vehiclePublicVisible: {
    key: SETTINGS_KEYS.vehiclePublicVisible,
    defaultValue: VEHICLE_PUBLIC_VISIBLE_DEFAULT,
  },
  vehicleRental: {
    key: SETTINGS_KEYS.vehicleRentalEnabled,
    defaultValue: VEHICLE_RENTAL_DEFAULT,
  },
};

/** Parses the stored text value; anything unrecognised falls back to the default. */
export function parseBooleanSetting(value: string | null | undefined, fallback: boolean): boolean {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

/** Serialises a boolean for storage. Only `'true'` / `'false'` are ever written. */
export function serialiseBooleanSetting(value: boolean): string {
  return value ? 'true' : 'false';
}

/**
 * Which vehicle `dealType` values are rentable. `both` counts as rentable because
 * such a listing is offered for rent as well as for sale.
 */
export const RENTABLE_DEAL_TYPES = ['rent', 'both'] as const;

/** True when a vehicle's deal type includes rental. */
export function isRentableDealType(dealType: string): boolean {
  return (RENTABLE_DEAL_TYPES as readonly string[]).includes(dealType);
}

/**
 * Deal types that carry a sale price.
 *
 * `rent` is deliberately absent: a rental-only listing is not saleable, so it is
 * the only kind that disappears entirely when the rental service is switched off.
 * `both` is present because it *is* a genuine sale listing — dropping it would
 * hide saleable inventory, which the brief forbids.
 *
 * The database enforces the price with CHECK constraints (`deal_type='sale'` ⇒
 * `sale_price NOT NULL`, `deal_type='both'` ⇒ both prices NOT NULL), so a visible
 * sale listing can always be sold on price alone and never needs the rental figure
 * to be shown.
 */
export const SALE_DEAL_TYPES = ['sale', 'both'] as const;

/**
 * SQL predicate for "row is visible while the agency has no rental service".
 *
 * Kept next to the policy constant so the rule has exactly one definition: a pure
 * sale listing is always visible, a `both` listing is visible while it still has a
 * sale price, and a rental-only listing is never visible.
 *
 * The literal `deal_type IN (...)` is generated from `SALE_DEAL_TYPES`, and the
 * price is re-checked at query time even though the schema already guarantees it:
 * a hand-edited or legacy database must fail closed rather than render a sale
 * listing with no price.
 *
 * It takes no parameters — the values are compile-time constants, never input.
 */
export const SAFE_PROJECTION_SQL = `(v.deal_type IN (${SALE_DEAL_TYPES.map((t) => `'${t}'`).join(',')}) AND v.sale_price IS NOT NULL)`;

/** The three presentation fields a public vehicle view derives from a row. */
export interface VehiclePresentation {
  dealType: string;
  dailyPrice: number | null;
  salePrice: number | null;
}

/**
 * Public projection of a vehicle row.
 *
 * When rental is disabled, a `both` listing is still published for sale, but its
 * rental price must not leak into the public surface (it would advertise a
 * service the agency does not offer, and it drives the card's headline price).
 * Only the *presentation* changes: the database row keeps both prices untouched,
 * so re-enabling rental restores the original view exactly.
 *
 * With rental enabled this is the identity function, so the default behaviour is
 * byte-for-byte what it was before this setting existed.
 */
export function projectVehicleForPublic(
  vehicle: VehiclePresentation,
  rentalEnabled: boolean,
): VehiclePresentation {
  if (rentalEnabled) return vehicle;
  // A `both` listing that still carries a sale price is shown as a sale listing
  // with the rental figure withheld. A `both` row without a sale price cannot
  // reach here (the query excludes it), but it is deliberately left untouched
  // rather than guessed at.
  if (vehicle.dealType === 'both' && vehicle.salePrice !== null) {
    return { dealType: 'sale', dailyPrice: null, salePrice: vehicle.salePrice };
  }
  return vehicle;
}


/**
 * ---------------------------------------------------------------------------
 * Public visibility policy — the ONE place that decides what the public sees.
 * ---------------------------------------------------------------------------
 *
 * Every public surface derives from this module: navigation, the homepage, the
 * catalogue, detail pages, statistics, the sitemap, metadata and the public
 * inquiry endpoint. Routes and components must not re-derive the rule from the
 * database flag themselves, otherwise a new surface can silently leak.
 *
 * Three concepts, deliberately separated:
 *
 *   * PUBLIC VISIBILITY  — may a visitor see the vehicle section at all?
 *   * RENTAL OFFER       — while visible, is rental part of it?
 *   * ADMIN AVAILABILITY — may an operator manage vehicles? (always yes)
 *
 * Hiding is a *projection*: no row is updated, deleted or migrated, so turning
 * public visibility back on restores the exact previous state.
 */
export interface VehicleVisibility {
  /** True when any vehicle URL, section, statistic or sitemap entry is public. */
  publicVisible: boolean;
  /** True when the public site advertises rental. Always false while hidden. */
  rentalEnabled: boolean;
}

/** What a hidden section means for every public reader. */
export const HIDDEN_VEHICLES: VehicleVisibility = { publicVisible: false, rentalEnabled: false };

/**
 * Resolves the effective visibility from the two stored flags.
 *
 * Hidden wins: the rental flag cannot make a hidden section visible, which keeps
 * the two settings from interfering and makes the outcome trivial to reason about.
 */
export function resolveVehicleVisibility(flags: {
  publicVisible: boolean;
  rentalEnabled: boolean;
}): VehicleVisibility {
  if (!flags.publicVisible) return HIDDEN_VEHICLES;
  return { publicVisible: true, rentalEnabled: flags.rentalEnabled };
}

/**
 * The rental refinement of a *visible* section, as a SQL predicate fragment.
 *
 * Only meaningful for queries that run while the section is public; a hidden
 * section is short-circuited before reaching the database.
 */
export const RENTAL_VISIBLE_SQL =
  `(v.deal_type IN ('sale','both') AND v.sale_price IS NOT NULL)`;
