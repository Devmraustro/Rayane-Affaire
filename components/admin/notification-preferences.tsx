'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUser } from '@/types';
import { useI18n } from '@/lib/i18n';
import { adminFetch } from '@/lib/admin-client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function NotificationPreferences({ user, emailConfigured }: { user: AdminUser; emailConfigured: boolean }) {
  const { locale } = useI18n(); const router = useRouter(); const [email, setEmail] = React.useState(user.notificationEmail ?? user.email); const [inquiries, setInquiries] = React.useState(user.notifyNewInquiry); const [reservations, setReservations] = React.useState(user.notifyReservation); const [busy, setBusy] = React.useState(false);
  const save = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); const result = await adminFetch('/api/admin/notifications', { method: 'PATCH', body: { notificationEmail: email, notifyNewInquiry: inquiries, notifyReservation: reservations } }); setBusy(false); toast.success(result.ok ? (locale === 'ar' ? 'تم حفظ التفضيلات' : 'Préférences enregistrées') : (locale === 'ar' ? 'تعذر الحفظ' : 'Enregistrement impossible')); if (result.ok) router.refresh(); };
  return <form onSubmit={save} className="max-w-2xl space-y-4 rounded-2xl border border-sand-200 bg-white p-5"><Field label={locale === 'ar' ? 'بريد الإشعارات' : 'E-mail de notification'} htmlFor="notification-email"><Input id="notification-email" type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={inquiries} onChange={(event) => setInquiries(event.target.checked)} className="size-4" />{locale === 'ar' ? 'إشعار عند وصول طلب جديد' : 'Recevoir un e-mail pour chaque nouvelle demande'}</label><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={reservations} onChange={(event) => setReservations(event.target.checked)} className="size-4" />{locale === 'ar' ? 'إشعار عند إنشاء حجز' : 'Recevoir un e-mail pour chaque nouvelle réservation'}</label><p className={`rounded-lg px-3 py-2 text-xs ${emailConfigured ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>{emailConfigured ? (locale === 'ar' ? 'خدمة البريد مهيأة.' : 'Le service Resend est configuré.') : (locale === 'ar' ? 'التفضيلات محفوظة لكن الإرسال يتطلب EMAIL_DELIVERY=resend وRESEND_API_KEY وEMAIL_FROM.' : 'Les préférences sont enregistrées, mais l’envoi exige EMAIL_DELIVERY=resend, RESEND_API_KEY et EMAIL_FROM.')}</p><Button type="submit" variant="gold" disabled={busy}>{locale === 'ar' ? 'حفظ التفضيلات' : 'Enregistrer les préférences'}</Button></form>;
}
