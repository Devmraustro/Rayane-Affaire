'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Loader2, Plus, Trash2 } from 'lucide-react';
import type { Customer, Reservation, ReservationStatus } from '@/types';
import { useI18n } from '@/lib/i18n';
import { adminFetch } from '@/lib/admin-client';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { formatDate, formatPrice } from '@/lib/format';
import { toast } from 'sonner';

interface ListingOption { id: string; reference: string; titleFr: string }
const statuses: ReservationStatus[] = ['pending','confirmed','active','completed','cancelled'];
export function ReservationManager({ initialReservations, initialCustomers, properties, vehicles, canDelete }: {
  initialReservations: Reservation[]; initialCustomers: Customer[];
  properties: ListingOption[]; vehicles: ListingOption[]; canDelete: boolean;
}) {
  const { t, locale } = useI18n(); const router = useRouter(); const [reservations, setReservations] = React.useState(initialReservations); const [customers, setCustomers] = React.useState(initialCustomers);
  const [creating, setCreating] = React.useState(false); const [kind, setKind] = React.useState<'property'|'vehicle'>('property'); const [customerChoice, setCustomerChoice] = React.useState('new'); const [filter, setFilter] = React.useState('all'); const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState('');
  React.useEffect(() => setReservations(initialReservations), [initialReservations]); React.useEffect(() => setCustomers(initialCustomers), [initialCustomers]);
  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); const data = new FormData(event.currentTarget); let customerId = customerChoice;
    try {
      if (customerChoice === 'new') {
        const customer = await adminFetch<Customer>('/api/admin/customers', { method: 'POST', body: { fullName: String(data.get('fullName') ?? ''), phone: String(data.get('phone') ?? ''), email: String(data.get('email') ?? ''), type: 'individual', notes: '', tags: [] } });
        if (!customer.ok || !customer.data) throw new Error('CUSTOMER'); customerId = customer.data.id; setCustomers((current) => [...current, customer.data!]);
      }
      const listingId = String(data.get('listingId') ?? '');
      const result = await adminFetch<Reservation>('/api/admin/reservations', { method: 'POST', body: { kind, propertyId: kind === 'property' ? listingId : undefined, vehicleId: kind === 'vehicle' ? listingId : undefined, customerId, startDate: String(data.get('startDate') ?? ''), endDate: String(data.get('endDate') ?? ''), amount: Number(data.get('amount') ?? 0), deposit: Number(data.get('deposit') ?? 0), status: 'pending', notes: String(data.get('notes') ?? '') } });
      if (!result.ok || !result.data) { setError(result.error?.code === 'RESERVATION_OVERLAP' ? (locale === 'ar' ? 'يوجد حجز متعارض لهذه الفترة.' : 'Une réservation active chevauche déjà cette période.') : (locale === 'ar' ? 'بيانات الحجز غير صالحة.' : 'Données de réservation invalides.')); setBusy(false); return; }
      setReservations((current) => [...current, result.data!].sort((a,b) => a.startDate.localeCompare(b.startDate))); setCreating(false); toast.success(t.admin.saved); router.refresh();
    } catch { setError(locale === 'ar' ? 'بيانات العميل غير صالحة.' : 'Coordonnées client invalides.'); }
    setBusy(false);
  };
  const update = async (id: string, status: ReservationStatus) => { const result = await adminFetch<Reservation>(`/api/admin/reservations/${id}`, { method: 'PATCH', body: { status } }); if (!result.ok || !result.data) { toast.error(result.error?.code === 'RESERVATION_OVERLAP' ? 'RESERVATION_OVERLAP' : t.common.error); return; } setReservations((current) => current.map((item) => item.id === id ? result.data! : item)); router.refresh(); };
  const remove = async (id: string) => { if (!window.confirm(t.admin.confirmDeleteBody)) return; const result = await adminFetch(`/api/admin/reservations/${id}`, { method: 'DELETE' }); if (result.ok) { setReservations((current) => current.filter((item) => item.id !== id)); router.refresh(); } else toast.error(t.common.error); };
  const visible = filter === 'all' ? reservations : reservations.filter((item) => item.status === filter);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Select aria-label={t.admin.table.status} value={filter} onChange={(event) => setFilter(event.target.value)} className="max-w-56"><option value="all">{t.admin.table.status}</option>{statuses.map((status) => <option key={status} value={status}>{t.labels.reservationStatus[status]}</option>)}</Select><Button type="button" variant="gold" onClick={() => setCreating((value) => !value)}><Plus />{locale === 'ar' ? 'حجز جديد' : 'Nouvelle réservation'}</Button></div>
    {creating && <form onSubmit={create} className="grid gap-4 rounded-2xl border border-sand-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"><h2 className="text-sm font-semibold sm:col-span-2 lg:col-span-3">{locale === 'ar' ? 'إنشاء حجز' : 'Créer une réservation'}</h2>{error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger sm:col-span-2 lg:col-span-3">{error}</p>}
      <Field label={t.admin.table.item} htmlFor="reservation-kind"><Select id="reservation-kind" value={kind} onChange={(event) => setKind(event.target.value as 'property'|'vehicle')}><option value="property">{t.labels.kind.property}</option><option value="vehicle">{t.labels.kind.vehicle}</option></Select></Field>
      <Field label={t.admin.table.item} htmlFor="listingId" required><Select id="listingId" name="listingId" required>{(kind === 'property' ? properties : vehicles).map((item) => <option key={item.id} value={item.id}>{item.reference} — {item.titleFr}</option>)}</Select></Field>
      <Field label={t.admin.table.customer} htmlFor="customerId"><Select id="customerId" value={customerChoice} onChange={(event) => setCustomerChoice(event.target.value)}><option value="new">{locale === 'ar' ? 'عميل جديد' : 'Nouveau client'}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} — {customer.phone}</option>)}</Select></Field>
      {customerChoice === 'new' && <><Field label="Nom · الاسم" htmlFor="reservation-fullName" required><Input id="reservation-fullName" name="fullName" required minLength={3} /></Field><Field label={t.contact.phone} htmlFor="reservation-phone" required><Input id="reservation-phone" name="phone" dir="ltr" required /></Field><Field label={t.contact.email} htmlFor="reservation-email"><Input id="reservation-email" name="email" type="email" dir="ltr" /></Field></>}
      <Field label={t.admin.form.availableFrom} htmlFor="startDate" required><Input id="startDate" name="startDate" type="date" required /></Field><Field label={locale === 'ar' ? 'تاريخ الانتهاء' : 'Date de fin'} htmlFor="endDate" required><Input id="endDate" name="endDate" type="date" required /></Field>
      <Field label={t.admin.table.amount} htmlFor="amount" required><Input id="amount" name="amount" type="number" min={0} required /></Field><Field label={locale === 'ar' ? 'العربون' : 'Acompte'} htmlFor="deposit"><Input id="deposit" name="deposit" type="number" min={0} defaultValue={0} /></Field><Field label="Notes · ملاحظات" htmlFor="reservation-notes"><Input id="reservation-notes" name="notes" maxLength={2000} /></Field>
      <div className="sm:col-span-2 lg:col-span-3"><Button type="submit" variant="primary" disabled={busy || (kind === 'property' ? properties.length === 0 : vehicles.length === 0)}>{busy && <Loader2 className="animate-spin" />}{locale === 'ar' ? 'حفظ الحجز' : 'Enregistrer la réservation'}</Button></div>
    </form>}
    {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-sand-300 bg-white px-6 py-14 text-center"><CalendarCheck className="mx-auto size-8 text-ink-300" /><p className="mt-3 text-sm text-ink-500">{t.admin.empty.reservations}</p></div> : <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b bg-sand-50 text-2xs uppercase text-ink-400"><th className="px-4 py-2.5 text-start">{t.admin.table.reference}</th><th className="px-4 py-2.5 text-start">{t.admin.table.item}</th><th className="px-4 py-2.5 text-start">{t.admin.table.customer}</th><th className="px-4 py-2.5 text-start">{t.admin.table.dates}</th><th className="px-4 py-2.5 text-start">{t.admin.table.amount}</th><th className="px-4 py-2.5 text-start">{t.admin.table.status}</th><th className="px-4 py-2.5 text-start">{t.admin.table.actions}</th></tr></thead><tbody className="divide-y divide-sand-100">{visible.map((reservation) => <tr key={reservation.id}><td className="px-4 py-3 font-mono text-xs">{reservation.reference}</td><td className="px-4 py-3"><span className="text-xs font-medium">{reservation.itemReference}</span><span className="block text-2xs text-ink-400">{reservation.itemTitle[locale]}</span></td><td className="px-4 py-3 text-xs">{reservation.customerName}<span dir="ltr" className="block text-ink-400">{reservation.customerPhone}</span></td><td className="px-4 py-3 text-xs">{formatDate(reservation.startDate, locale)} → {formatDate(reservation.endDate, locale)}</td><td className="px-4 py-3 text-xs">{formatPrice(reservation.amount, locale)}<span className="block text-ink-400">{formatPrice(reservation.deposit, locale)}</span></td><td className="px-4 py-3"><Select aria-label={`status ${reservation.reference}`} value={reservation.status} onChange={(event) => void update(reservation.id, event.target.value as ReservationStatus)}>{statuses.map((status) => <option key={status} value={status}>{t.labels.reservationStatus[status]}</option>)}</Select></td><td className="px-4 py-3">{canDelete && <button type="button" onClick={() => void remove(reservation.id)} aria-label={t.admin.delete} className="grid size-8 place-items-center rounded-lg text-danger hover:bg-danger-soft"><Trash2 className="size-4" /></button>}</td></tr>)}</tbody></table></div>}
  </div>;
}
