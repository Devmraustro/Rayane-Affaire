'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import type { Place } from '@/types';
import { useI18n } from '@/lib/i18n';
import { placesText } from '@/lib/i18n/place-copy';
import { adminFetch } from '@/lib/admin-client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function PlaceActions({ id, status, canDelete }: { id: string; status: Place['status']; canDelete: boolean }) {
  const { locale } = useI18n(); const copy = placesText(locale); const router = useRouter();
  const setStatus = async (next: Place['status']) => {
    const result = await adminFetch(`/api/admin/places/${id}`, { method: 'PATCH', body: { statusOnly: next } });
    if (!result.ok) { toast.error(copy.mediaFirst); return; }
    toast.success(copy.saved); router.refresh();
  };
  const remove = async () => {
    if (!window.confirm(copy.deleteConfirm)) return;
    const result = await adminFetch(`/api/admin/places/${id}`, { method: 'DELETE' });
    if (!result.ok) { toast.error(copy.geocodeError); return; }
    toast.success(copy.deleted); router.push('/admin/places'); router.refresh();
  };
  return <div className="flex flex-wrap items-center gap-1.5">
    <Link href={`/admin/places/${id}/preview`} aria-label={copy.preview} className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-sand-100"><Eye className="size-4" /></Link>
    <Link href={`/admin/places/${id}/edit`} aria-label={copy.edit} className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-sand-100"><Pencil className="size-4" /></Link>
    {status !== 'published' ? <Button type="button" size="sm" variant="outline" onClick={() => void setStatus('published')}>{copy.publish}</Button> : <Button type="button" size="sm" variant="outline" onClick={() => void setStatus('draft')}>{copy.unpublish}</Button>}
    {status !== 'archived' && <Button type="button" size="sm" variant="ghost" onClick={() => void setStatus('archived')}>{copy.archive}</Button>}
    {canDelete && <button type="button" onClick={() => void remove()} aria-label={copy.delete} className="grid size-8 place-items-center rounded-lg text-danger hover:bg-danger-soft"><Trash2 className="size-4" /></button>}
  </div>;
}
