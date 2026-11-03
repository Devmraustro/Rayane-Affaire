'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import type { Commune, Property } from '@/types';
import { useI18n } from '@/lib/i18n';
import { adminFetch } from '@/lib/admin-client';
import { propertyWriteSchema, fieldErrors } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select, Field } from '@/components/ui/input';
import { MediaManager } from './media-manager';
import { CoordinatePicker } from './coordinate-picker';
import { toast } from 'sonner';

/**
 * Property create/edit form.
 *
 * Validates with the exact schema the API uses, so the operator sees the same
 * messages the server would return. Media upload requires a persisted id, so on
 * "create" the listing is saved as a draft first and the user is then sent to
 * the edit screen to attach photographs.
 */
export function PropertyForm({
  communes,
  property,
}: {
  communes: Commune[];
  property?: Property;
}) {
  const { t, msg } = useI18n();
  const router = useRouter();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const isEdit = Boolean(property);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    const formData = new FormData(event.currentTarget);

    const numeric = (key: string): number | null => {
      const raw = formData.get(key);
      if (raw === null || raw === '') return null;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    };

    const raw = {
      titleFr: String(formData.get('titleFr') ?? ''),
      titleAr: String(formData.get('titleAr') ?? ''),
      descriptionFr: String(formData.get('descriptionFr') ?? ''),
      descriptionAr: String(formData.get('descriptionAr') ?? ''),
      category: String(formData.get('category') ?? 'apartment'),
      transaction: String(formData.get('transaction') ?? 'rent_annual'),
      price: numeric('price') ?? 0,
      priceUnit: String(formData.get('priceUnit') ?? 'month'),
      communeSlug: String(formData.get('communeSlug') ?? ''),
      addressFr: String(formData.get('addressFr') ?? ''),
      addressAr: String(formData.get('addressAr') ?? ''),
      lat: numeric('lat'),
      lng: numeric('lng'),
      coordinatePrecision: String(formData.get('coordinatePrecision') ?? 'pending'),
      surface: numeric('surface') ?? 0,
      bedrooms: numeric('bedrooms') ?? 0,
      bathrooms: numeric('bathrooms') ?? 0,
      floor: numeric('floor'),
      furnishing: String(formData.get('furnishing') ?? 'unfurnished'),
      amenities: String(formData.get('amenities') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      availabilityStatus: String(formData.get('availabilityStatus') ?? 'available'),
      availableFrom: String(formData.get('availableFrom') ?? '') || null,
      featured: formData.get('featured') === 'on',
      status: String(formData.get('status') ?? 'draft'),
    };

    const parsed = propertyWriteSchema.safeParse(raw);
    if (!parsed.success) {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(fieldErrors(parsed.error))) {
        mapped[key] = msg(value);
      }
      setErrors(mapped);
      toast.error(t.form.requiredFields);
      return;
    }

    setSaving(true);
    const result = await adminFetch<Property>(
      isEdit ? `/api/admin/properties/${property!.id}` : '/api/admin/properties',
      { method: isEdit ? 'PATCH' : 'POST', body: parsed.data },
    );
    setSaving(false);

    if (!result.ok) {
      const code = result.error?.code;
      if (code === 'MEDIA_REQUIRED') {
        toast.error(msg('admin.validation.mediaRequiredForPublish'));
      } else if (result.error?.fields) {
        const mapped: Record<string, string> = {};
        for (const [key, value] of Object.entries(result.error.fields)) mapped[key] = msg(value);
        setErrors(mapped);
        toast.error(t.form.requiredFields);
      } else {
        toast.error(t.common.error);
      }
      return;
    }

    toast.success(t.admin.saved);
    if (!isEdit && result.data) {
      router.push(`/admin/properties/${result.data.id}/edit`);
      router.refresh();
      return;
    }
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/properties')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-gold-700"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5 rtl:rotate-180" />
          {t.common.backToList}
        </button>
        <Button type="submit" variant="primary" size="sm" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {saving ? t.admin.saving : t.admin.save}
        </Button>
      </div>

      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">{t.admin.form.identity}</h2>
        <p className="mt-1 text-2xs text-ink-400">
          {property ? `${t.admin.table.reference} ${property.reference}` : '—'}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t.admin.form.titleFr} htmlFor="titleFr" required error={errors.titleFr}>
            <Input id="titleFr" name="titleFr" defaultValue={property?.title.fr} maxLength={140} required />
          </Field>
          <Field label={t.admin.form.titleAr} htmlFor="titleAr" required error={errors.titleAr}>
            <Input id="titleAr" name="titleAr" dir="rtl" defaultValue={property?.title.ar} maxLength={140} required />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t.admin.form.descriptionFr} htmlFor="descriptionFr">
            <Textarea id="descriptionFr" name="descriptionFr" defaultValue={property?.description.fr} maxLength={4000} />
          </Field>
          <Field label={t.admin.form.descriptionAr} htmlFor="descriptionAr">
            <Textarea id="descriptionAr" name="descriptionAr" dir="rtl" defaultValue={property?.description.ar} maxLength={4000} />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t.admin.form.category} htmlFor="category">
            <Select id="category" name="category" defaultValue={property?.category ?? 'apartment'}>
              {(['apartment', 'studio', 'villa', 'house', 'commercial', 'land', 'office'] as const).map((key) => (
                <option key={key} value={key}>
                  {t.labels.propertyCategory[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.admin.form.transaction} htmlFor="transaction">
            <Select id="transaction" name="transaction" defaultValue={property?.transaction ?? 'rent_annual'}>
              {(['rent_annual', 'rent_short', 'sale', 'exchange'] as const).map((key) => (
                <option key={key} value={key}>
                  {t.labels.transaction[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.admin.form.price} htmlFor="price" required error={errors.price}>
            <Input
              id="price"
              name="price"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              defaultValue={property?.price ?? ''}
              required
            />
          </Field>
          <Field label={t.admin.form.transaction} htmlFor="priceUnit">
            <Select id="priceUnit" name="priceUnit" defaultValue={property?.priceUnit ?? 'month'}>
              <option value="month">{t.common.perMonth}</option>
              <option value="night">{t.common.perNight}</option>
              <option value="total">{t.common.total}</option>
            </Select>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">{t.properties.detail.characteristics}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t.admin.form.surface} htmlFor="surface">
            <Input id="surface" name="surface" type="number" min={0} defaultValue={property?.surface ?? ''} />
          </Field>
          <Field label={t.admin.form.bedrooms} htmlFor="bedrooms">
            <Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={property?.bedrooms ?? 0} />
          </Field>
          <Field label={t.admin.form.bathrooms} htmlFor="bathrooms">
            <Input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={property?.bathrooms ?? 0} />
          </Field>
          <Field label={t.admin.form.floor} htmlFor="floor">
            <Input id="floor" name="floor" type="number" defaultValue={property?.floor ?? ''} />
          </Field>
          <Field label={t.admin.form.furnishing} htmlFor="furnishing">
            <Select id="furnishing" name="furnishing" defaultValue={property?.furnishing ?? 'unfurnished'}>
              <option value="unfurnished">{t.labels.furnishing.unfurnished}</option>
              <option value="semi_furnished">{t.labels.furnishing.semi_furnished}</option>
              <option value="furnished">{t.labels.furnishing.furnished}</option>
            </Select>
          </Field>
          <Field label={t.admin.form.availability} htmlFor="availabilityStatus">
            <Select id="availabilityStatus" name="availabilityStatus" defaultValue={property?.availabilityStatus ?? 'available'}>
              <option value="available">{t.labels.availability.available}</option>
              <option value="reserved">{t.labels.availability.reserved}</option>
              <option value="unavailable">{t.labels.availability.unavailable}</option>
            </Select>
          </Field>
          <Field label={t.admin.form.availableFrom} htmlFor="availableFrom">
            <Input id="availableFrom" name="availableFrom" type="date" defaultValue={property?.availableFrom ?? ''} />
          </Field>
          <Field label={t.admin.form.features} htmlFor="amenities" hint="Séparés par des virgules">
            <Input
              id="amenities"
              name="amenities"
              defaultValue={property?.amenities.join(', ') ?? ''}
              placeholder="Ascenseur, Parking, Balcon"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t.admin.form.addressFr} htmlFor="addressFr">
            <Input id="addressFr" name="addressFr" defaultValue={property?.address.fr} maxLength={200} />
          </Field>
          <Field label={t.admin.form.addressAr} htmlFor="addressAr">
            <Input id="addressAr" name="addressAr" dir="rtl" defaultValue={property?.address.ar} maxLength={200} />
          </Field>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={property?.featured}
            className="size-4 rounded border-sand-300 text-gold-600 focus:ring-gold-400"
          />
          {t.admin.form.featured}
        </label>
      </section>

      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">{t.admin.form.location}</h2>
        <div className="mt-4">
          <CoordinatePicker
            communes={communes}
            initial={{
              lat: property?.coordinates?.lat ?? null,
              lng: property?.coordinates?.lng ?? null,
              precision: property?.coordinatePrecision ?? 'pending',
              communeSlug: property?.commune.slug ?? communes[0]?.slug ?? '',
              title: property?.title.fr ?? '',
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">{t.admin.form.media}</h2>
        <div className="mt-4">
          <MediaManager entityType="property" entityId={property?.id ?? null} initial={property?.media ?? []} />
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-5">
        <Field label={t.admin.table.status} htmlFor="status">
          <Select id="status" name="status" defaultValue={property?.status ?? 'draft'}>
            <option value="draft">{t.labels.status.draft}</option>
            <option value="published">{t.labels.status.published}</option>
            <option value="archived">{t.labels.status.archived}</option>
          </Select>
        </Field>
        <Button type="submit" variant="gold" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {saving ? t.admin.saving : t.admin.save}
        </Button>
      </section>
    </form>
  );
}
