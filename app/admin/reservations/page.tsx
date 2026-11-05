import { cookies } from 'next/headers';
import { listReservations } from '@/lib/db/reservations';
import { listCustomers } from '@/lib/db/customers';
import { listAdminProperties, listAdminVehicles } from '@/lib/db/admin-listings';
import { getSession } from '@/lib/server/session';
import { roleSatisfies } from '@/lib/server/authz';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { ReservationManager } from '@/components/admin/reservation-manager';

export const dynamic = 'force-dynamic';
export default async function AdminReservationsPage() {
  const jar = await cookies(); const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value); const t = dictionaries[locale];
  const session = await getSession();
  const reservations = listReservations({ includeDemo: false });
  return <div><div className="mb-5"><h1 className="text-2xl">{t.admin.nav.reservations}</h1><p className="mt-1 text-sm text-ink-500">{reservations.length} {t.common.results}</p></div><ReservationManager initialReservations={reservations} initialCustomers={listCustomers()} properties={listAdminProperties({})} vehicles={listAdminVehicles({})} canDelete={session ? roleSatisfies(session.user.role, 'manager') : false} /></div>;
}
