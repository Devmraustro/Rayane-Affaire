'use client';

import * as React from 'react';
import Image from 'next/image';
import { Upload, Trash2, Loader2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import type { MediaItem } from '@/types';
import { useI18n } from '@/lib/i18n';
import { adminUpload, adminFetch } from '@/lib/admin-client';
import { UPLOAD } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { toast } from 'sonner';

/**
 * Photograph manager.
 *
 * Enforces the client-side half of the upload contract (type + size) for fast
 * feedback; the server independently re-validates magic bytes and size. Each
 * image carries bilingual alt text and an attribution field, because externally
 * licensed photography must be credited wherever it is shown.
 */
export function MediaManager({
  entityType,
  entityId,
  initial,
}: {
  entityType: 'property' | 'vehicle' | 'place';
  entityId: string | null;
  initial: MediaItem[];
}) {
  const { t, msg, pick } = useI18n();
  const [items, setItems] = React.useState<MediaItem[]>(initial);
  const [uploading, setUploading] = React.useState(false);
  const [altFr, setAltFr] = React.useState('');
  const [altAr, setAltAr] = React.useState('');
  const [credit, setCredit] = React.useState('');
  const [license, setLicense] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Attribution is not optional: every published photograph must state who took
   * it and under which licence, because the brief forbids publishing client
   * imagery without documented rights. The server enforces the same rule, so
   * this check is UX, not security.
   */
  const attributionMissing = !credit.trim() || !license.trim();
  const altMissing = !altFr.trim() || !altAr.trim();
  const canUpload = Boolean(entityId) && !attributionMissing && !altMissing;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!entityId) {
      toast.error(msg('admin.validation.mediaRequiredForPublish'));
      return;
    }
    if (altMissing) {
      toast.error(msg('admin.validation.altRequired'));
      return;
    }
    if (attributionMissing) {
      toast.error(msg('admin.validation.attributionRequired'));
      return;
    }

    const selected = Array.from(files);
    const invalid = selected.find(
      (file) =>
        file.size > UPLOAD.maxFileBytes ||
        !UPLOAD.acceptedMimeTypes.includes(file.type as (typeof UPLOAD.acceptedMimeTypes)[number]),
    );
    if (invalid) {
      toast.error(t.admin.form.uploadHint);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.set('entityType', entityType);
    formData.set('entityId', entityId);
    formData.set('altFr', altFr);
    formData.set('altAr', altAr);
    formData.set('credit', credit);
    formData.set('license', license);
    for (const file of selected.slice(0, UPLOAD.maxFilesPerRequest)) formData.append('files', file);

    const result = await adminUpload('/api/admin/media', formData);
    setUploading(false);

    if (!result.ok || !result.data) {
      toast.error(
        result.error?.code === 'TOO_LARGE' ? t.admin.form.uploadHint : t.common.error,
      );
      return;
    }

    setItems((current) => [
      ...current,
      ...result.data!.map((uploaded, index) => ({
        id: uploaded.id,
        url: uploaded.url,
        alt: { fr: altFr || 'Photo', ar: altAr || altFr || 'صورة' },
        width: null,
        height: null,
        sortOrder: current.length + index,
        credit: credit || null,
        sourceUrl: null,
        license: license || null,
      })),
    ]);
    setAltFr('');
    setAltAr('');
    if (inputRef.current) inputRef.current.value = '';
    toast.success(t.admin.saved);
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.admin.confirmDeleteBody)) return;
    const result = await adminFetch(`/api/admin/media?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!result.ok) {
      toast.error(t.common.error);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
    toast.success(t.admin.saved);
  };

  const saveOrder = async (next: MediaItem[]) => {
    if (!entityId) return;
    const previous = items;
    setItems(next.map((item, index) => ({ ...item, sortOrder: index })));
    const result = await adminFetch('/api/admin/media', {
      method: 'PATCH',
      body: { entityType, entityId, mediaIds: next.map((item) => item.id) },
    });
    if (!result.ok) {
      setItems(previous);
      toast.error(t.common.error);
      return;
    }
    toast.success(t.admin.saved);
  };

  const move = async (id: string, direction: -1 | 1) => {
    const from = items.findIndex((item) => item.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    await saveOrder(next);
  };

  const drop = async (targetId: string, draggedId: string) => {
    if (targetId === draggedId) return;
    const from = items.findIndex((item) => item.id === draggedId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    await saveOrder(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-sand-300 bg-sand-50 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`${t.admin.form.titleFr} (alt)`} htmlFor="altFr">
            <Input
              id="altFr"
              value={altFr}
              onChange={(event) => setAltFr(event.target.value)}
              maxLength={200}
              placeholder="Salon lumineux, vue mer"
            />
          </Field>
          <Field label={`${t.admin.form.titleAr} (alt)`} htmlFor="altAr">
            <Input
              id="altAr"
              value={altAr}
              onChange={(event) => setAltAr(event.target.value)}
              maxLength={200}
              dir="rtl"
              placeholder="صالة مضيئة بإطلالة على البحر"
            />
          </Field>
          <Field label={`Crédit *`} htmlFor="credit">
            <Input
              id="credit"
              value={credit}
              onChange={(event) => setCredit(event.target.value)}
              maxLength={200}
              placeholder="Photo : nom du photographe"
            />
          </Field>
          <Field label={`Licence *`} htmlFor="license">
            <Input
              id="license"
              value={license}
              onChange={(event) => setLicense(event.target.value)}
              maxLength={120}
              placeholder="CC BY-SA 4.0 / © agence"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={UPLOAD.acceptedMimeTypes.join(',')}
            multiple
            onChange={(event) => void onFiles(event.target.files)}
            className="hidden"
            id="media-input"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || !canUpload}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {uploading ? t.admin.saving : t.admin.form.media}
          </Button>
          <p className="text-2xs text-ink-400">{t.admin.form.uploadHint}</p>
        </div>
        {!entityId && <p className="mt-2 text-2xs text-warning">{t.admin.form.noMedia}</p>}
        {entityId && (attributionMissing || altMissing) && (
          <p className="mt-2 text-2xs text-ink-500">{msg('admin.validation.attributionRequired')}</p>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand-300 px-4 py-6 text-center text-xs text-ink-400">
          {msg('admin.form.noMedia')}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.id}
              data-testid="media-item"
              data-media-id={item.id}
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); void drop(item.id, event.dataTransfer.getData('text/plain')); }}
              className="group relative overflow-hidden rounded-xl border border-sand-200 bg-white"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={item.url}
                  alt={pick(item.alt) || 'Photo'}
                  fill
                  unoptimized
                  sizes="200px"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="inline-flex items-center gap-1 text-2xs text-ink-400">
                  <GripVertical aria-hidden="true" className="size-3 cursor-grab" />
                  {item.sortOrder + 1}
                </span>
                <div className="flex items-center gap-0.5">
                  <button type="button" disabled={item.sortOrder === 0} onClick={() => void move(item.id, -1)} aria-label={`${item.id} up`} className="grid size-6 place-items-center rounded-md text-ink-500 hover:bg-sand-100 disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
                  <button type="button" disabled={item.sortOrder === items.length - 1} onClick={() => void move(item.id, 1)} aria-label={`${item.id} down`} className="grid size-6 place-items-center rounded-md text-ink-500 hover:bg-sand-100 disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    aria-label={t.admin.delete}
                    className="grid size-6 place-items-center rounded-md text-danger hover:bg-danger-soft"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {item.credit && (
                <p className="line-clamp-1 border-t border-sand-100 px-2 py-1 text-[0.625rem] text-ink-300">
                  {item.credit}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
