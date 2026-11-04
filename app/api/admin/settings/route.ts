import { z } from 'zod';
import { requireAdmin, HttpError } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { ok, fail } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';
import {
  readAllSettings,
  setVehiclePublicVisible,
  setVehicleRentalEnabled,
} from '@/lib/db/settings';

/**
 * PATCH /api/admin/settings
 *
 * Flips operational switches. Deliberately narrow: the payload is a strict object
 * of known keys, so an unknown field is rejected instead of silently ignored, and
 * a client cannot invent a setting the application does not read.
 *
 * Requires `manager` (not `editor`): exposing or hiding the whole public vehicle
 * section is a business decision that adds or removes a public area, so it is not
 * something any content editor should be able to change by accident.
 *
 * Every mutation is authenticated against the database session row, checked
 * against the CSRF token, and written to the audit log with the previous and new
 * value so the timeline is reconstructable.
 */

const patchSchema = z
  .object({
    /** Master switch for the public vehicle section. */
    vehiclePublicVisible: z.boolean().optional(),
    /** Rental refinement of a visible section. */
    vehicleRentalEnabled: z.boolean().optional(),
  })
  .strict();

export async function PATCH(request: Request): Promise<Response> {
  let session;
  try {
    session = await requireAdmin('manager', credentialsFromRequest(request));
  } catch (error) {
    if (error instanceof HttpError) return fail(error.code, error.message, error.status);
    return fail('UNAUTHORIZED', 'Authentication required.', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('BAD_REQUEST', 'Invalid JSON body.', 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string') fields[key] = 'admin.validation.invalidSetting';
    }
    return fail('VALIDATION', 'Invalid settings payload.', 422, fields);
  }

  if (Object.keys(parsed.data).length === 0) {
    return fail('VALIDATION', 'No setting provided.', 422);
  }

  const before = readAllSettings();
  const changed: Record<string, { from: unknown; to: unknown }> = {};

  if (parsed.data.vehiclePublicVisible !== undefined) {
    const next = setVehiclePublicVisible(parsed.data.vehiclePublicVisible);
    if (next !== before.vehiclePublicVisible) {
      changed.vehiclePublicVisible = { from: before.vehiclePublicVisible, to: next };
    }
  }

  if (parsed.data.vehicleRentalEnabled !== undefined) {
    const next = setVehicleRentalEnabled(parsed.data.vehicleRentalEnabled);
    if (next !== before.vehicleRentalEnabled) {
      changed.vehicleRentalEnabled = { from: before.vehicleRentalEnabled, to: next };
    }
  }

  if (Object.keys(changed).length > 0) {
    recordAudit(session, 'settings.update', 'settings', null, changed);
  }

  return ok({ ...readAllSettings(), changed: Object.keys(changed).length > 0 });
}
