'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Car, Loader2, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { adminFetch } from '@/lib/admin-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Vehicle rental visibility switch.
 *
 * The client asked for a real control, not a decoration: flipping it changes what
 * the public site serves (navigation, catalogue, featured block, sitemap). So the
 * component is deliberately explicit about consequences, announces the change to
 * assistive technology, and reflects only the value the server confirmed back.
 *
 * The switch is optimistic on the visual level but reverts if the request fails —
 * an operator must never believe a setting was saved when it was not.
 */
export function VehicleRentalToggle({ enabled }: { enabled: boolean }) {
  const { t, msg } = useI18n();
  const router = useRouter();
  const [value, setValue] = React.useState(enabled);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Keep in sync when the server re-renders the page after a refresh.
  React.useEffect(() => setValue(enabled), [enabled]);

  const toggle = async () => {
    const next = !value;
    setSaving(true);
    setSaved(false);
    const result = await adminFetch('/api/admin/settings', {
      method: 'PATCH',
      body: { vehicleRentalEnabled: next },
    });
    setSaving(false);

    if (!result.ok) {
      // Server refused (role, CSRF, validation): do not pretend it worked.
      toast.error(t.common.error);
      setValue(enabled);
      return;
    }

    const data = result.data as { vehicleRentalEnabled?: boolean } | undefined;
    setValue(data?.vehicleRentalEnabled ?? next);
    setSaved(true);
    toast.success(t.admin.saved);
    router.refresh();
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Car aria-hidden="true" className="size-4 text-ink-400" />
            {t.admin.settings.vehicleRental.title}
          </h2>
          <p className="mt-1.5 text-xs leading-5 text-ink-500">
            {t.admin.settings.vehicleRental.body}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-busy={saving}
          aria-label={t.admin.settings.vehicleRental.title}
          disabled={saving}
          onClick={() => void toggle()}
          data-testid="vehicle-rental-switch"
          data-state={value ? 'on' : 'off'}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 disabled:opacity-60',
            value ? 'bg-gold-600' : 'bg-sand-300',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'inline-block size-4.5 rounded-full bg-white shadow transition-transform',
              value ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>

      <p
        className="mt-3 flex flex-wrap items-center gap-2 text-xs"
        aria-live="polite"
        data-testid="vehicle-rental-state"
      >
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium',
            value ? 'bg-success-soft text-[#1c6b45]' : 'bg-sand-100 text-ink-600',
          )}
        >
          {saving ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : saved ? (
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
          ) : null}
          {value
            ? t.admin.settings.vehicleRental.on
            : t.admin.settings.vehicleRental.off}
        </span>
        <span className="text-ink-400">
          {value
            ? t.admin.settings.vehicleRental.onHint
            : t.admin.settings.vehicleRental.offHint}
        </span>
      </p>

      <p className="mt-2 text-2xs leading-4 text-ink-400">
        {msg('admin.settings.vehicleRental.saleUnaffected')}
      </p>
    </section>
  );
}
