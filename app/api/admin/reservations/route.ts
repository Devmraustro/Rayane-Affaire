import { fieldErrors, reservationWriteSchema } from '@/lib/validation';
import { createReservation, ReservationError } from '@/lib/db/reservations';
import { HttpError, requireAdmin } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, isSameOrigin, ok } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';
import { notifyAdministrators } from '@/lib/server/notifications';
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  let session; try { session = await requireAdmin('editor', credentialsFromRequest(request)); } catch (error) { if (error instanceof HttpError) return fail(error.code, error.message, error.status); return fail('UNAUTHORIZED', 'Authentication required.', 401); }
  let body: unknown; try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const parsed = reservationWriteSchema.safeParse(body); if (!parsed.success) return fail('VALIDATION', 'Invalid reservation payload.', 422, fieldErrors(parsed.error));
  try {
    const reservation = createReservation(parsed.data);
    recordAudit(session, 'reservation.create', 'reservation', reservation.id, { reference: reservation.reference });
    await notifyAdministrators('reservation', 'RAYANE AFFAIRE — nouvelle réservation', `La réservation ${reservation.reference} est disponible dans /admin/reservations.`);
    return ok(reservation);
  } catch (error) {
    if (error instanceof ReservationError) return fail(error.code, error.message, 422);
    if (String((error as Error).message).includes('not found')) return fail('NOT_FOUND', 'Listing or customer not found.', 404);
    console.error('[reservations] create failed', error); return fail('SERVER_ERROR', 'Could not create the reservation.', 500);
  }
}
