'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, Send, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { inquirySchema, fieldErrors } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select, Field } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Lead capture form.
 *
 * The same Zod schema validates here (instant, localised messages) and in the
 * API route (authoritative). A honeypot field and a server-side rate limit
 * handle abuse; success and failure states are explicit and translatable.
 */
export function InquiryForm({
  propertyId,
  vehicleId,
  intent = 'general',
  compact = false,
  title,
  className,
}: {
  propertyId?: string;
  vehicleId?: string;
  intent?: 'general' | 'property' | 'vehicle' | 'reservation';
  compact?: boolean;
  title?: string;
  className?: string;
}) {
  const { t, locale, msg } = useI18n();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [state, setState] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [serverMessage, setServerMessage] = React.useState('');
  const formRef = React.useRef<HTMLFormElement>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setServerMessage('');

    const formData = new FormData(event.currentTarget);
    const raw = {
      fullName: String(formData.get('fullName') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      email: String(formData.get('email') ?? ''),
      message: String(formData.get('message') ?? ''),
      preferredChannel: String(formData.get('preferredChannel') ?? 'phone'),
      consent: formData.get('consent') === 'on',
      website: String(formData.get('website') ?? ''),
      locale,
      type: intent,
      propertyId,
      vehicleId,
      startDate: String(formData.get('startDate') ?? ''),
      endDate: String(formData.get('endDate') ?? ''),
    };

    const parsed = inquirySchema.safeParse(raw);
    if (!parsed.success) {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(fieldErrors(parsed.error))) {
        mapped[key] = msg(value);
      }
      setErrors(mapped);
      return;
    }

    setState('submitting');
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const body = payload as { error?: { code?: string; message?: string; fields?: Record<string, string> } };
        if (body.error?.code === 'RATE_LIMITED') {
          setServerMessage(t.form.rateLimited);
        } else if (body.error?.code === 'VALIDATION') {
          const mapped: Record<string, string> = {};
          for (const [key, value] of Object.entries(body.error.fields ?? {})) mapped[key] = msg(value);
          setErrors(mapped);
          setServerMessage(t.form.requiredFields);
        } else {
          setServerMessage(t.contact.errorBody);
        }
        setState('error');
        return;
      }

      setState('success');
      formRef.current?.reset();
    } catch {
      setState('error');
      setServerMessage(t.contact.errorBody);
    }
  };

  if (state === 'success') {
    return (
      <div
        className={cn(
          'rounded-2xl border border-success/25 bg-success-soft p-6 text-center',
          className,
        )}
        role="status"
      >
        <CheckCircle2 aria-hidden="true" className="mx-auto size-8 text-success" />
        <h3 className="mt-3 text-base font-semibold text-ink-900">{t.contact.successTitle}</h3>
        <p className="mt-1.5 text-sm leading-6 text-ink-600">{t.contact.successBody}</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className={cn('rounded-2xl border border-sand-200 bg-white p-5 shadow-card sm:p-6', className)}
    >
      {title && <h2 className="mb-4 text-base font-semibold text-ink-900">{title}</h2>}

      {serverMessage && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{serverMessage}</span>
        </div>
      )}

      <div className="space-y-3.5">
        <div className={cn('grid gap-3.5', !compact && 'sm:grid-cols-2')}>
          <Field
            label={t.contact.fullName}
            htmlFor="fullName"
            required
            error={errors.fullName}
          >
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              required
              maxLength={120}
              invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            />
          </Field>

          <Field label={t.contact.phoneField} htmlFor="phone" required error={errors.phone}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="0550 12 34 56"
              required
              maxLength={24}
              invalid={Boolean(errors.phone)}
            />
          </Field>
        </div>

        <Field label={`${t.contact.emailField} (${t.common.optional})`} htmlFor="email" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            maxLength={160}
            invalid={Boolean(errors.email)}
          />
        </Field>

        {intent === 'reservation' && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label={t.contact.startDate} htmlFor="startDate" error={errors.startDate}>
              <Input id="startDate" name="startDate" type="date" min={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label={t.contact.endDate} htmlFor="endDate" error={errors.endDate}>
              <Input id="endDate" name="endDate" type="date" min={new Date().toISOString().slice(0, 10)} />
            </Field>
          </div>
        )}

        <Field label={t.contact.message} htmlFor="message" required error={errors.message}>
          <Textarea
            id="message"
            name="message"
            required
            maxLength={2000}
            placeholder={t.contact.messagePlaceholder}
            invalid={Boolean(errors.message)}
          />
        </Field>

        <Field label={t.contact.preferredChannel} htmlFor="preferredChannel">
          <Select id="preferredChannel" name="preferredChannel" defaultValue="phone">
            <option value="phone">{t.contact.phone}</option>
            <option value="whatsapp">{t.contact.whatsapp}</option>
            <option value="email">{t.contact.email}</option>
          </Select>
        </Field>

        {/* Honeypot — visually hidden, must stay empty. */}
        <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-ink-500">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 size-4 shrink-0 rounded border-sand-300 text-gold-600 focus:ring-gold-400"
          />
          <span>
            {t.form.consent}
            {errors.consent && (
              <span className="mt-1 block font-medium text-danger">{errors.consent}</span>
            )}
          </span>
        </label>

        <Button type="submit" variant="gold" className="w-full" disabled={state === 'submitting'}>
          {state === 'submitting' ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              {t.contact.submitting}
            </>
          ) : (
            <>
              <Send aria-hidden="true" />
              {t.contact.submit}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
