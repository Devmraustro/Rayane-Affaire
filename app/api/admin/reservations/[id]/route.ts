import { z } from 'zod';
import { deleteReservation, ReservationError, updateReservationStatus } from '@/lib/db/reservations';
import { HttpError, requireAdmin } from '@/lib/server/authz';
import { credentialsFromRequest } from '@/lib/server/credentials';
import { fail, isSameOrigin, ok } from '@/lib/server/api';
import { recordAudit } from '@/lib/server/audit';
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  let session; try { session = await requireAdmin('editor', credentialsFromRequest(request)); } catch (error) { if (error instanceof HttpError) return fail(error.code, error.message, error.status); return fail('UNAUTHORIZED', 'Authentication required.', 401); }
  let body: unknown; try { body = await request.json(); } catch { return fail('BAD_REQUEST', 'Invalid JSON body.', 400); }
  const parsed = z.object({ status: z.enum(['pending','confirmed','active','completed','cancelled']) }).safeParse(body); if (!parsed.success) return fail('VALIDATION', 'Invalid reservation status.', 422);
  const id = (await context.params).id;
  try { const reservation = updateReservationStatus(id, parsed.data.status); if (!reservation) return fail('NOT_FOUND', 'Reservation not found.', 404); recordAudit(session, 'reservation.status', 'reservation', id, { status: parsed.data.status }); return ok(reservation); }
  catch (error) { if (error instanceof ReservationError) return fail(error.code, error.message, 422); return fail('SERVER_ERROR', 'Could not update the reservation.', 500); }
}
export async function DELETE(request: Request, context: Context): Promise<Response> {
  if (!isSameOrigin(request)) return fail('FORBIDDEN', 'Cross-origin request rejected.', 403);
  let session; try { session = await requireAdmin('manager', credentialsFromRequest(request)); } catch (error) { if (error instanceof HttpError) return fail(error.code, error.message, error.status); return fail('UNAUTHORIZED', 'Authentication required.', 401); }
  const id = (await context.params).id; if (!deleteReservation(id)) return fail('NOT_FOUND', 'Reservation not found.', 404); recordAudit(session, 'reservation.delete', 'reservation', id); return ok({ deleted: true });
}
