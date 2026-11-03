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
