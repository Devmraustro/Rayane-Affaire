import '@/lib/server/guard';
import { getDb } from '@/db/client';
import {
  SETTING_DEFINITIONS,
  parseBooleanSetting,
  serialiseBooleanSetting,
  type SettingKey,
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
 * Whether the agency offers vehicle rental.
 *
 * Single source of truth for the public site, the admin UI, the sitemap and the
 * catalogue. Called on every public render, so it is a single indexed primary-key
 * lookup — cheap enough not to warrant caching that could go stale after a save.
 */
export function isVehicleRentalEnabled(): boolean {
  const definition = SETTING_DEFINITIONS.vehicleRental;
  return getBooleanSetting(definition.key, definition.defaultValue);
}

/** Writes the rental flag. Used by the admin API after authorization + CSRF. */
export function setVehicleRentalEnabled(value: boolean): boolean {
  return setBooleanSetting(SETTING_DEFINITIONS.vehicleRental.key, value);
}

/** Every boolean setting, for the admin settings page. */
export function readAllSettings(): { vehicleRentalEnabled: boolean } {
  return { vehicleRentalEnabled: isVehicleRentalEnabled() };
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
