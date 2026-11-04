'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import type { Commune, Vehicle } from '@/types';
import { useI18n } from '@/lib/i18n';
import { adminFetch } from '@/lib/admin-client';
import { vehicleWriteSchema, fieldErrors } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select, Field } from '@/components/ui/input';
import { MediaManager } from './media-manager';
import { CoordinatePicker } from './coordinate-picker';
import { toast } from 'sonner';

export function VehicleForm({ communes, vehicle }: { communes: Commune[]; vehicle?: Vehicle }) {
  const { t, msg } = useI18n();
  const router = useRouter();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const isEdit = Boolean(vehicle);

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
      brand: String(formData.get('brand') ?? ''),
      model: String(formData.get('model') ?? ''),
      year: numeric('year') ?? new Date().getFullYear(),
      category: String(formData.get('category') ?? 'economy'),
      transmission: String(formData.get('transmission') ?? 'manual'),
      fuel: String(formData.get('fuel') ?? 'petrol'),
      seats: numeric('seats') ?? 5,
      doors: numeric('doors') ?? 5,
      dealType: String(formData.get('dealType') ?? 'rent'),
      dailyPrice: numeric('dailyPrice'),
      salePrice: numeric('salePrice'),
      communeSlug: String(formData.get('communeSlug') ?? ''),
      lat: numeric('lat'),
      lng: numeric('lng'),
      coordinatePrecision: String(formData.get('coordinatePrecision') ?? 'pending'),
      mileageKm: numeric('mileageKm'),
      features: String(formData.get('features') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      availabilityStatus: String(formData.get('availabilityStatus') ?? 'available'),
      featured: formData.get('featured') === 'on',
      status: String(formData.get('status') ?? 'draft'),
    };

    const parsed = vehicleWriteSchema.safeParse(raw);
    if (!parsed.success) {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(fieldErrors(parsed.error))) mapped[key] = msg(value);
      setErrors(mapped);
      toast.error(t.form.requiredFields);
      return;
    }

    setSaving(true);
    const result = await adminFetch<Vehicle>(
      isEdit ? `/api/admin/vehicles/${vehicle!.id}` : '/api/admin/vehicles',
      { method: isEdit ? 'PATCH' : 'POST', body: parsed.data },
    );
    setSaving(false);

    if (!result.ok) {
      if (result.error?.code === 'MEDIA_REQUIRED') {
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
      router.push(`/admin/vehicles/${result.data.id}/edit`);
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
          onClick={() => router.push('/admin/vehicles')}
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
          {vehicle ? `${t.admin.table.reference} ${vehicle.reference}` : '—'}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t.admin.form.titleFr} htmlFor="titleFr" required error={errors.titleFr}>
            <Input id="titleFr" name="titleFr" defaultValue={vehicle?.title.fr} maxLength={140} required />
          </Field>
          <Field label={t.admin.form.titleAr} htmlFor="titleAr" required error={errors.titleAr}>
            <Input id="titleAr" name="titleAr" dir="rtl" defaultValue={vehicle?.title.ar} maxLength={140} required />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t.admin.form.descriptionFr} htmlFor="descriptionFr">
            <Textarea id="descriptionFr" name="descriptionFr" defaultValue={vehicle?.description.fr} maxLength={4000} />
          </Field>
          <Field label={t.admin.form.descriptionAr} htmlFor="descriptionAr">
            <Textarea id="descriptionAr" name="descriptionAr" dir="rtl" defaultValue={vehicle?.description.ar} maxLength={4000} />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label={t.admin.form.brand} htmlFor="brand" required error={errors.brand}>
            <Input id="brand" name="brand" defaultValue={vehicle?.brand} maxLength={60} required />
          </Field>
          <Field label={t.admin.form.model} htmlFor="model" required error={errors.model}>
            <Input id="model" name="model" defaultValue={vehicle?.model} maxLength={60} required />
          </Field>
          <Field label={t.admin.form.year} htmlFor="year" required error={errors.year}>
            <Input
              id="year"
              name="year"
              type="number"
              min={1950}
              max={2100}
              defaultValue={vehicle?.year ?? new Date().getFullYear()}
              required
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">{t.properties.detail.characteristics}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t.admin.form.category} htmlFor="category">
            <Select id="category" name="category" defaultValue={vehicle?.category ?? 'economy'}>
              {(['economy', 'sedan', 'suv', 'luxury', 'utility', 'van'] as const).map((key) => (
                <option key={key} value={key}>
                  {t.labels.vehicleCategory[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.admin.form.transmission} htmlFor="transmission">
            <Select id="transmission" name="transmission" defaultValue={vehicle?.transmission ?? 'manual'}>
              <option value="manual">{t.labels.transmission.manual}</option>
              <option value="automatic">{t.labels.transmission.automatic}</option>
            </Select>
          </Field>
          <Field label={t.admin.form.fuel} htmlFor="fuel">
            <Select id="fuel" name="fuel" defaultValue={vehicle?.fuel ?? 'petrol'}>
              <option value="petrol">{t.labels.fuel.petrol}</option>
              <option value="diesel">{t.labels.fuel.diesel}</option>
              <option value="hybrid">{t.labels.fuel.hybrid}</option>
              <option value="electric">{t.labels.fuel.electric}</option>
              <option value="lpg">{t.labels.fuel.lpg}</option>
            </Select>
          </Field>
          <Field label={t.admin.form.dealType} htmlFor="dealType">
            <Select id="dealType" name="dealType" defaultValue={vehicle?.dealType ?? 'rent'}>
              <option value="rent">{t.labels.dealType.rent}</option>
              <option value="sale">{t.labels.dealType.sale}</option>
              <option value="both">{t.labels.dealType.both}</option>
            </Select>
          </Field>
          <Field label={t.admin.form.dailyPrice} htmlFor="dailyPrice" error={errors.dailyPrice}>
            <Input
              id="dailyPrice"
              name="dailyPrice"
              type="number"
              min={0}
              step={500}
              defaultValue={vehicle?.dailyPrice ?? ''}
            />
          </Field>
          <Field label={t.admin.form.salePrice} htmlFor="salePrice" error={errors.salePrice}>
            <Input
              id="salePrice"
              name="salePrice"
              type="number"
              min={0}
              step={10000}
              defaultValue={vehicle?.salePrice ?? ''}
            />
          </Field>
          <Field label={t.admin.form.seats} htmlFor="seats">
            <Input id="seats" name="seats" type="number" min={1} max={30} defaultValue={vehicle?.seats ?? 5} />
          </Field>
          <Field label={t.admin.form.doors} htmlFor="doors">
            <Input id="doors" name="doors" type="number" min={2} max={6} defaultValue={vehicle?.doors ?? 5} />
          </Field>
          <Field label={t.admin.form.mileage} htmlFor="mileageKm">
            <Input
              id="mileageKm"
              name="mileageKm"
              type="number"
              min={0}
              step={1000}
              defaultValue={vehicle?.mileageKm ?? ''}
            />
          </Field>
          <Field label={t.admin.form.availability} htmlFor="availabilityStatus">
            <Select id="availabilityStatus" name="availabilityStatus" defaultValue={vehicle?.availabilityStatus ?? 'available'}>
              <option value="available">{t.labels.availability.available}</option>
              <option value="reserved">{t.labels.availability.reserved}</option>
              <option value="unavailable">{t.labels.availability.unavailable}</option>
            </Select>
          </Field>
          <Field label={t.admin.form.features} htmlFor="features" hint="Séparés par des virgules" className="sm:col-span-2">
            <Input
              id="features"
              name="features"
              defaultValue={vehicle?.features.join(', ') ?? ''}
              placeholder="Climatisation, GPS, Bluetooth"
            />
          </Field>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={vehicle?.featured}
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
              lat: vehicle?.coordinates?.lat ?? null,
              lng: vehicle?.coordinates?.lng ?? null,
              precision: vehicle?.coordinatePrecision ?? 'pending',
              communeSlug: vehicle?.commune.slug ?? communes[0]?.slug ?? '',
              title: vehicle?.title.fr ?? '',
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">{t.admin.form.media}</h2>
        <div className="mt-4">
          <MediaManager entityType="vehicle" entityId={vehicle?.id ?? null} initial={vehicle?.media ?? []} />
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white p-5">
        <Field label={t.admin.table.status} htmlFor="status">
          <Select id="status" name="status" defaultValue={vehicle?.status ?? 'draft'}>
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
