'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';

export function LoginForm({ configured }: { configured: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(data.get('email') ?? ''),
          password: String(data.get('password') ?? ''),
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: { user?: { mustChangePassword?: boolean } };
        error?: { code?: string; message?: string };
      };

      if (!response.ok || !payload.ok) {
        const code = payload.error?.code;
        setError(
          code === 'RATE_LIMITED'
            ? t.auth.tooManyAttempts
            : code === 'NOT_CONFIGURED'
              ? t.auth.notConfiguredBody
              : t.auth.invalidCredentials,
        );
        setSubmitting(false);
        return;
      }

      // Full refresh so server components re-read the new session cookie.
      router.replace(payload.data?.user?.mustChangePassword ? '/admin/password' : '/admin');
      router.refresh();
    } catch {
      setError(t.common.error);
      setSubmitting(false);
    }
  };

  if (!configured) {
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-warning/25 bg-warning-soft p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#7a5312]">
            <ShieldAlert aria-hidden="true" className="size-4" />
            {t.auth.notConfiguredTitle}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#7a5312]">{t.auth.notConfiguredBody}</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-white/70 p-2.5 text-[0.6875rem] text-ink-700">
{`ADMIN_EMAIL=vous@rayane-affaire.dz \\
ADMIN_PASSWORD='un-mot-de-passe-fort' \\
npm run db:seed:admin`}
          </pre>
        </div>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-gold-700"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          {t.errors.backHome}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <span className="grid size-11 place-items-center rounded-xl bg-ink-900 text-gold-400">
        <LockKeyhole aria-hidden="true" className="size-5" />
      </span>
      <h1 className="mt-4 text-2xl">{t.auth.loginTitle}</h1>
      <p className="mt-1.5 text-sm text-ink-500">{t.auth.loginSubtitle}</p>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label={t.auth.email} htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            dir="ltr"
            required
            maxLength={160}
          />
        </Field>
        <Field label={t.auth.password} htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            required
            maxLength={200}
          />
        </Field>
        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              {t.auth.submitting}
            </>
          ) : (
            t.auth.submit
          )}
        </Button>
      </form>

      <Link href="/forgot-password" className="mt-4 inline-flex text-xs font-medium text-gold-700 hover:underline">
        {locale === 'ar' ? 'نسيت كلمة المرور؟' : 'Mot de passe oublié ?'}
      </Link>
      <br />
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-gold-700"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        {t.errors.backHome}
      </Link>
    </div>
  );
}
