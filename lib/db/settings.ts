import '@/lib/server/guard';
import { getDb } from '@/db/client';
import {
  SETTING_DEFINITIONS,
  parseBooleanSetting,
  resolveVehicleVisibility,
  serialiseBooleanSetting,
  type SettingKey,
  type VehicleVisibility,
} from '@/lib/settings';

/**
 * Settings repository.
 *
 * The `settings` table is a key/value store for operational choices that must
 * survive a deployment without a rebuild — as opposed to anything the owner
 * considers part of the code (contact details stay in environment variables).
 *
 * Reads tolerate a missing row and fall back to the documented default, so a
 * database migrated before a setting existed still behaves predictably.
 */

function readRaw(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

function writeRaw(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value, new Date().toISOString());
}

/** Reads a boolean setting, falling back to its documented default. */
export function getBooleanSetting(key: SettingKey, fallback: boolean): boolean {
  return parseBooleanSetting(readRaw(key), fallback);
}

/** Persists a boolean setting. Returns the value actually stored. */
export function setBooleanSetting(key: SettingKey, value: boolean): boolean {
  writeRaw(key, serialiseBooleanSetting(value));
  return value;
}

/**
 * Whether the vehicle section is public at all.
 *
 * Master switch: when this is false, nothing vehicle-related may reach a visitor.
 */
export function isVehiclePublicVisible(): boolean {
  const definition = SETTING_DEFINITIONS.vehiclePublicVisible;
  return getBooleanSetting(definition.key, definition.defaultValue);
}

/** Writes the public-visibility flag. Admin API only, after auth + CSRF. */
export function setVehiclePublicVisible(value: boolean): boolean {
  return setBooleanSetting(SETTING_DEFINITIONS.vehiclePublicVisible.key, value);
}

/**
 * Whether the agency offers vehicle rental, *within a visible section*.
 *
 * Read on its own this says nothing about whether vehicles are public — use
 * `getVehicleVisibility()` for that.
 */
export function isVehicleRentalEnabled(): boolean {
  const definition = SETTING_DEFINITIONS.vehicleRental;
  return getBooleanSetting(definition.key, definition.defaultValue);
}

/** Writes the rental flag. Used by the admin API after authorization + CSRF. */
export function setVehicleRentalEnabled(value: boolean): boolean {
  return setBooleanSetting(SETTING_DEFINITIONS.vehicleRental.key, value);
}

/**
 * The single authority every public surface must consult.
 *
 * Two primary-key reads per public render — cheap enough not to warrant a cache
 * that could serve a stale "visible" answer after an operator hides the section.
 */
export function getVehicleVisibility(): VehicleVisibility {
  return resolveVehicleVisibility({
    publicVisible: isVehiclePublicVisible(),
    rentalEnabled: isVehicleRentalEnabled(),
  });
}

/** Every boolean setting, for the admin settings page and its API. */
export function readAllSettings(): {
  vehiclePublicVisible: boolean;
  vehicleRentalEnabled: boolean;
} {
  return {
    vehiclePublicVisible: isVehiclePublicVisible(),
    vehicleRentalEnabled: isVehicleRentalEnabled(),
  };
}

/** Creates the default rows so an operator can see the current value in the DB. */
export function seedDefaultSettings(): void {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING`,
  );
  const now = new Date().toISOString();
  for (const definition of Object.values(SETTING_DEFINITIONS)) {
    insert.run(definition.key, serialiseBooleanSetting(definition.defaultValue), now);
  }
}
