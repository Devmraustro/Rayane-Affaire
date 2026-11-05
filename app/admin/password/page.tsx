import { cookies } from 'next/headers';
import { PasswordChangeForm } from '@/components/admin/password-forms';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default async function PasswordPage() { const jar = await cookies(); const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value); return <div className="space-y-4"><h1 className="text-2xl">{locale === 'ar' ? 'تغيير كلمة المرور' : 'Changement de mot de passe'}</h1><p className="max-w-2xl text-sm leading-6 text-ink-500">{locale === 'ar' ? 'يجب استبدال كلمة المرور المؤقتة قبل الوصول إلى وظائف الإدارة. يتم إبطال الجلسات الأخرى بعد التغيير.' : 'Remplacez le mot de passe temporaire avant d’accéder aux fonctions d’administration. Les autres sessions sont révoquées après le changement.'}</p><PasswordChangeForm /></div>; }
