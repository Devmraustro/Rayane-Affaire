'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, EyeOff, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { adminFetch } from '@/lib/admin-client';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

/**
 * Publish / unpublish / archive / delete controls.
 *
 * The server re-checks every rule (e.g. publishing requires a photo); this
 * component merely surfaces the returned code as a localised toast.
 */
export function StatusActions({
  kind,
  id,
  status,
}: {
  kind: 'properties' | 'vehicles';
  id: string;
  status: 'draft' | 'published' | 'archived';
}) {
  const { t, msg } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const change = async (next: 'draft' | 'published' | 'archived' | 'delete') => {
    if (next === 'delete' && !window.confirm(t.admin.confirmDeleteBody)) return;
    setBusy(next);
    const result =
      next === 'delete'
        ? await adminFetch(`/api/admin/${kind}/${id}`, { method: 'DELETE' })
        : await adminFetch(`/api/admin/${kind}/${id}`, {
            method: 'PATCH',
            body: { statusOnly: next },
          });

    if (!result.ok) {
      const code = result.error?.code;
      const message =
        code === 'MEDIA_REQUIRED'
          ? msg('admin.validation.mediaRequiredForPublish')
          : code === 'CSRF' || code === 'UNAUTHORIZED'
            ? t.auth.sessionExpired
            : t.common.error;
      toast.error(message);
      setBusy(null);
      if (code === 'UNAUTHORIZED') router.push('/admin/login');
      return;
    }

    toast.success(t.admin.saved);
    setBusy(null);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        tone={status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'neutral'}
      >
        {t.labels.status[status]}
      </Badge>

      {status !== 'published' && (
        <IconButton
          label={t.admin.publish}
          busy={busy === 'published'}
          onClick={() => change('published')}
          icon={Send}
          tone="success"
        />
      )}
      {status === 'published' && (
        <IconButton
          label={t.admin.unpublish}
          busy={busy === 'draft'}
          onClick={() => change('draft')}
          icon={EyeOff}
        />
      )}
      {status !== 'archived' ? (
        <IconButton
          label={t.admin.archive}
          busy={busy === 'archived'}
          onClick={() => change('archived')}
          icon={Archive}
        />
      ) : (
        <IconButton
          label={t.admin.restore}
          busy={busy === 'draft'}
          onClick={() => change('draft')}
          icon={RotateCcw}
        />
      )}
      <IconButton
        label={t.admin.delete}
        busy={busy === 'delete'}
        onClick={() => change('delete')}
        icon={Trash2}
        tone="danger"
      />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  busy,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  icon: typeof Send;
  tone?: 'neutral' | 'danger' | 'success';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={label}
      aria-label={label}
      className={
        'grid size-8 place-items-center rounded-lg border transition-colors disabled:opacity-50 ' +
        (tone === 'danger'
          ? 'border-danger/25 text-danger hover:bg-danger-soft'
          : tone === 'success'
            ? 'border-success/25 text-success hover:bg-success-soft'
            : 'border-sand-300 text-ink-500 hover:bg-sand-100')
      }
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
    </button>
  );
}
