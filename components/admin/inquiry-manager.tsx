'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Phone, MessageCircle, Mail } from 'lucide-react';
import type { Inquiry, InquiryStatus } from '@/types';
import { useI18n } from '@/lib/i18n';
import { adminFetch } from '@/lib/admin-client';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { toast } from 'sonner';

/**
 * Inquiry work queue.
 *
 * A master/detail list (the shape GW used) driven entirely by the database. The
 * operator can move a lead through the funnel and record internal notes; every
 * change is authenticated, CSRF-checked and audited server-side.
 */
export function InquiryManager({ inquiries }: { inquiries: Inquiry[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<string | null>(inquiries[0]?.id ?? null);
  const [busy, setBusy] = React.useState(false);
  const [notes, setNotes] = React.useState('');

  const selected = inquiries.find((item) => item.id === selectedId) ?? null;

  React.useEffect(() => {
    setNotes(selected?.adminNotes ?? '');
  }, [selected]);

  const update = async (patch: { status?: InquiryStatus; adminNotes?: string }) => {
    if (!selected) return;
    setBusy(true);
    const result = await adminFetch(`/api/admin/inquiries/${selected.id}`, {
      method: 'PATCH',
      body: patch,
    });
    setBusy(false);
    if (!result.ok) {
      toast.error(t.common.error);
      return;
    }
    toast.success(t.admin.saved);
    router.refresh();
  };

  if (inquiries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sand-300 bg-white px-6 py-14 text-center">
        <p className="text-sm text-ink-500">{t.admin.empty.inquiries}</p>
      </div>
    );
  }

  const statuses: InquiryStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
      <ul className="max-h-[70vh] space-y-2 overflow-y-auto rounded-2xl border border-sand-200 bg-white p-2">
        {inquiries.map((inquiry) => (
          <li key={inquiry.id}>
            <button
              type="button"
              onClick={() => setSelectedId(inquiry.id)}
              aria-current={inquiry.id === selectedId}
              className={
                'w-full rounded-xl px-3 py-2.5 text-start transition-colors ' +
                (inquiry.id === selectedId ? 'bg-sand-100' : 'hover:bg-sand-50')
              }
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink-800">
                    {inquiry.fullName}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink-400">{inquiry.message}</span>
                </span>
                <Badge
                  tone={
                    inquiry.status === 'new'
                      ? 'info'
                      : inquiry.status === 'won'
                        ? 'success'
                        : inquiry.status === 'spam' || inquiry.status === 'lost'
                          ? 'danger'
                          : 'neutral'
                  }
                >
                  {t.labels.inquiryStatus[inquiry.status]}
                </Badge>
              </span>
              <span className="mt-1 block text-2xs text-ink-300">
                {formatDate(inquiry.createdAt, locale)}
                {inquiry.propertyReference ? ` · ${inquiry.propertyReference}` : ''}
                {inquiry.vehicleReference ? ` · ${inquiry.vehicleReference}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="rounded-2xl border border-sand-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{selected.fullName}</h2>
              <p className="mt-0.5 text-xs text-ink-400">
                {t.labels.inquiryType[selected.type]} · {formatDate(selected.createdAt, locale)}
              </p>
            </div>
            <Badge
              tone={
                selected.status === 'new'
                  ? 'info'
                  : selected.status === 'won'
                    ? 'success'
                    : selected.status === 'spam' || selected.status === 'lost'
                      ? 'danger'
                      : 'neutral'
              }
            >
              {t.labels.inquiryStatus[selected.status]}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`tel:${selected.phone}`}
              dir="ltr"
              className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-gold-400"
            >
              <Phone aria-hidden="true" className="size-3.5" />
              {selected.phone}
            </a>
            <a
              href={`https://wa.me/${selected.phone.replace(/^0/, '213')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-gold-400"
            >
              <MessageCircle aria-hidden="true" className="size-3.5" />
              WhatsApp
            </a>
            {selected.email && (
              <a
                href={`mailto:${selected.email}`}
                dir="ltr"
                className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-gold-400"
              >
                <Mail aria-hidden="true" className="size-3.5" />
                {selected.email}
              </a>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-sand-50 p-3.5 text-sm leading-6 text-ink-700">
            {selected.message}
          </div>

          {(selected.propertyReference || selected.vehicleReference) && (
            <p className="mt-3 text-xs text-ink-400">
              {t.admin.inquiry.relatedListing}:{' '}
              <span className="font-medium text-ink-700">
                {selected.propertyReference ?? selected.vehicleReference}
              </span>
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-2xs font-medium uppercase tracking-[0.08em] text-ink-400">
                {t.admin.inquiry.updateStatus}
              </span>
              <Select
                value={selected.status}
                disabled={busy}
                onChange={(event) => void update({ status: event.target.value as InquiryStatus })}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {t.labels.inquiryStatus[status]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="block text-2xs font-medium uppercase tracking-[0.08em] text-ink-400">
                {t.admin.inquiry.notes}
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={4000}
                className="w-full rounded-xl border border-sand-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void update({ adminNotes: notes })}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-xs font-medium text-white hover:bg-ink-800 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {t.admin.save}
          </button>
        </div>
      )}
    </div>
  );
}
