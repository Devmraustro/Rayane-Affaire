'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { adminFetch } from '@/lib/admin-client';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

function words(locale: 'fr' | 'ar') { return locale === 'ar' ? { current: 'كلمة المرور الحالية', next: 'كلمة المرور الجديدة', confirm: 'تأكيد كلمة المرور', submit: 'تغيير كلمة المرور', saving: 'جارٍ الحفظ…', mismatch: 'كلمتا المرور غير متطابقتين', error: 'تعذر تغيير كلمة المرور. تحقق من كلمة المرور الحالية وقواعد كلمة المرور.', success: 'تم تغيير كلمة المرور' } : { current: 'Mot de passe actuel', next: 'Nouveau mot de passe', confirm: 'Confirmer le mot de passe', submit: 'Changer le mot de passe', saving: 'Enregistrement…', mismatch: 'Les mots de passe ne correspondent pas', error: 'Impossible de changer le mot de passe. Vérifiez le mot de passe actuel et la politique de robustesse.', success: 'Mot de passe modifié' }; }

export function PasswordChangeForm() {
  const { locale } = useI18n(); const copy = words(locale); const router = useRouter();
  const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState('');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); const data = new FormData(event.currentTarget);
    if (data.get('newPassword') !== data.get('confirmPassword')) { setError(copy.mismatch); return; }
    setBusy(true); const result = await adminFetch('/api/auth/change-password', { method: 'POST', body: { currentPassword: String(data.get('currentPassword') ?? ''), newPassword: String(data.get('newPassword') ?? '') } }); setBusy(false);
    if (!result.ok) { setError(copy.error); return; }
    router.replace('/admin'); router.refresh();
  };
  return <form onSubmit={submit} className="max-w-lg space-y-4 rounded-2xl border border-sand-200 bg-white p-5" noValidate>
    {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
    <Field label={copy.current} htmlFor="currentPassword" required><Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></Field>
    <Field label={copy.next} htmlFor="newPassword" required hint="12+ · A-Z · a-z · 0-9"><Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={12} required /></Field>
    <Field label={copy.confirm} htmlFor="confirmPassword" required><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></Field>
    <Button type="submit" variant="gold" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{busy ? copy.saving : copy.submit}</Button>
  </form>;
}

export function ForgotPasswordForm() {
  const { locale } = useI18n(); const [busy, setBusy] = React.useState(false); const [done, setDone] = React.useState(false); const [error, setError] = React.useState('');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setBusy(true); setError(''); const data = new FormData(event.currentTarget); try { const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: String(data.get('email') ?? '') }) }); if (!response.ok) throw new Error(); setDone(true); } catch { setError(locale === 'ar' ? 'تعذر إرسال الطلب.' : 'Impossible d’envoyer la demande.'); } finally { setBusy(false); } };
  if (done) return <p role="status" className="rounded-xl border border-success/30 bg-success-soft p-4 text-sm leading-6 text-success">{locale === 'ar' ? 'إذا كان الحساب مؤهلاً وكانت خدمة البريد مهيأة، فسيصل رابط صالح لمدة 30 دقيقة. لا يكشف هذا الرد عن وجود الحساب.' : 'Si le compte est éligible et que le service e-mail est configuré, un lien valable 30 minutes sera envoyé. Cette réponse ne révèle pas si le compte existe.'}</p>;
  return <form onSubmit={submit} className="space-y-4" noValidate>{error && <p role="alert" className="text-xs text-danger">{error}</p>}<Field label="E-mail · البريد الإلكتروني" htmlFor="forgot-email" required><Input id="forgot-email" name="email" type="email" required dir="ltr" autoComplete="email" /></Field><Button type="submit" variant="primary" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{locale === 'ar' ? 'إرسال رابط الاستعادة' : 'Envoyer le lien de réinitialisation'}</Button></form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { locale } = useI18n(); const copy = words(locale); const router = useRouter(); const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState('');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); const data = new FormData(event.currentTarget); if (data.get('password') !== data.get('confirmPassword')) { setError(copy.mismatch); return; } setBusy(true); try { const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: String(data.get('password') ?? '') }) }); if (!response.ok) throw new Error(); router.replace('/admin/login'); router.refresh(); } catch { setError(locale === 'ar' ? 'الرابط غير صالح أو منتهي، أو كلمة المرور ضعيفة.' : 'Le lien est invalide/expiré ou le mot de passe est trop faible.'); } finally { setBusy(false); } };
  return <form onSubmit={submit} className="space-y-4" noValidate>{error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}<Field label={copy.next} htmlFor="reset-password" required hint="12+ · A-Z · a-z · 0-9"><Input id="reset-password" name="password" type="password" minLength={12} required autoComplete="new-password" /></Field><Field label={copy.confirm} htmlFor="reset-confirm" required><Input id="reset-confirm" name="confirmPassword" type="password" minLength={12} required autoComplete="new-password" /></Field><Button type="submit" variant="primary" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{copy.submit}</Button></form>;
}
