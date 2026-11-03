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

export const SETTING_DEFINITIONS: Record<'vehicleRental', SettingDefinition> = {
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
