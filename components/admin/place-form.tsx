'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Loader2, Save } from 'lucide-react';
import type { Commune, Place } from '@/types';
import { useI18n } from '@/lib/i18n';
import { placesText } from '@/lib/i18n/place-copy';
import { adminFetch } from '@/lib/admin-client';
import { fieldErrors, placeWriteSchema } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { MediaManager } from './media-manager';
import { PlaceLocationEditor } from './place-location-editor';
import { toast } from 'sonner';

export function PlaceForm({ communes, place: initialPlace }: { communes: Commune[]; place?: Place }) {
  const { locale, msg } = useI18n();
  const copy = placesText(locale);
  const router = useRouter();
  const [place, setPlace] = React.useState(initialPlace);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const categories = Object.keys(copy.categories) as (keyof typeof copy.categories)[];

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setErrors({});
    const data = new FormData(event.currentTarget);
    const number = (key: string) => { const value = String(data.get(key) ?? ''); if (!value) return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; };
    const raw = {
      nameFr: String(data.get('nameFr') ?? ''), nameAr: String(data.get('nameAr') ?? ''),
      descriptionFr: String(data.get('descriptionFr') ?? ''), descriptionAr: String(data.get('descriptionAr') ?? ''),
      addressFr: String(data.get('addressFr') ?? ''), addressAr: String(data.get('addressAr') ?? ''),
      communeSlug: String(data.get('communeSlug') ?? ''), category: String(data.get('category') ?? 'other'),
      lat: number('lat'), lng: number('lng'), coordinatePrecision: String(data.get('coordinatePrecision') ?? 'pending'),
      status: String(data.get('status') ?? 'draft'),
    };
    const parsed = placeWriteSchema.safeParse(raw);
    if (!parsed.success) {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(fieldErrors(parsed.error))) mapped[key] = key === 'lat' || key === 'lng' || key === 'coordinatePrecision' ? copy.invalidCoordinates : msg(value);
      setErrors(mapped); toast.error(copy.invalidCoordinates); return;
    }
    setSaving(true);
    const result = await adminFetch<Place>(place ? `/api/admin/places/${place.id}` : '/api/admin/places', { method: place ? 'PATCH' : 'POST', body: parsed.data });
    setSaving(false);
    if (!result.ok || !result.data) {
      if (result.error?.fields) {
        const mapped: Record<string, string> = {};
        for (const [key, value] of Object.entries(result.error.fields)) mapped[key] = msg(value);
        setErrors(mapped);
      }
      toast.error(result.error?.code === 'MEDIA_REQUIRED' ? copy.mediaFirst : copy.geocodeError); return;
    }
    setPlace(result.data); toast.success(copy.saved);
    if (!place) { router.push(`/admin/places/${result.data.id}/edit`); }
    router.refresh();
  };

  return <form onSubmit={submit} noValidate className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/admin/places" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-gold-700"><ArrowLeft className="size-3.5 rtl:rotate-180" />{copy.back}</Link>
      <div className="flex gap-2">
        {place && <Button asChild type="button" variant="outline" size="sm"><Link href={`/admin/places/${place.id}/preview`}><Eye />{copy.preview}</Link></Button>}
        <Button type="submit" variant="gold" size="sm" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}{saving ? copy.saving : copy.save}</Button>
      </div>
    </div>

    <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <h1 className="text-lg font-semibold text-ink-900">{place ? copy.edit : copy.new}</h1>
      {place && <p className="mt-1 font-mono text-2xs text-ink-400">{place.reference}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={copy.nameFr} htmlFor="nameFr" required error={errors.nameFr}><Input id="nameFr" name="nameFr" defaultValue={place?.name.fr} maxLength={160} required /></Field>
        <Field label={copy.nameAr} htmlFor="nameAr" required error={errors.nameAr}><Input id="nameAr" name="nameAr" dir="rtl" defaultValue={place?.name.ar} maxLength={160} required /></Field>
        <Field label={copy.descriptionFr} htmlFor="descriptionFr"><Textarea id="descriptionFr" name="descriptionFr" defaultValue={place?.description.fr} maxLength={6000} /></Field>
        <Field label={copy.descriptionAr} htmlFor="descriptionAr"><Textarea id="descriptionAr" name="descriptionAr" dir="rtl" defaultValue={place?.description.ar} maxLength={6000} /></Field>
        <Field label={copy.addressFr} htmlFor="addressFr"><Input id="addressFr" name="addressFr" defaultValue={place?.address.fr} maxLength={300} /></Field>
        <Field label={copy.addressAr} htmlFor="addressAr"><Input id="addressAr" name="addressAr" dir="rtl" defaultValue={place?.address.ar} maxLength={300} /></Field>
        <Field label={copy.category} htmlFor="category"><Select id="category" name="category" defaultValue={place?.category ?? 'landmark'}>{categories.map((category) => <option key={category} value={category}>{copy.categories[category]}</option>)}</Select></Field>
        <Field label={copy.status} htmlFor="status"><Select id="status" name="status" defaultValue={place?.status ?? 'draft'}><option value="draft">{copy.draft}</option><option value="published">{copy.published}</option><option value="archived">{copy.archived}</option></Select></Field>
      </div>
    </section>

    <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-ink-900">{copy.location}</h2>
      <div className="mt-4"><PlaceLocationEditor key={place?.updatedAt ?? 'new'} communes={communes} place={place} onPlaceChange={setPlace} /></div>
    </section>

    <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-ink-900">{copy.images}</h2>
      {!place && <p className="mt-1 text-xs text-warning">{copy.mediaFirst}</p>}
      <div className="mt-4"><MediaManager entityType="place" entityId={place?.id ?? null} initial={place?.media ?? []} /></div>
    </section>

    <div className="flex justify-end"><Button type="submit" variant="gold" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}{saving ? copy.saving : copy.save}</Button></div>
  </form>;
}
