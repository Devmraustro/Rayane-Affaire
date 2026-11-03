'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import type { Commune, VehicleFilters } from '@/types';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input, Select, Field } from '@/components/ui/input';
import { countActiveFilters } from '@/lib/filters';
import { cn } from '@/lib/utils';

/** Vehicle filter panel — same GET-form contract as the property panel. */
export function VehicleFiltersPanel({
  communes,
  filters,
}: {
  communes: Commune[];
  filters: VehicleFilters;
}) {
  const { t, pick } = useI18n();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const activeCount = countActiveFilters(filters);
  const action = '/vehicles';

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const search = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const v = String(value).trim();
      if (v) search.append(key, v);
    }
    router.push(search.toString() ? `${action}?${search}` : action);
  };

  const onSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const form = event.currentTarget.form;
    if (!form) return;
    const data = new FormData(form);
    const search = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const v = String(value).trim();
      if (v) search.append(key, v);
    }
    router.push(search.toString() ? `${action}?${search}` : action);
  };

  return (
    <div className="lg:sticky lg:top-24">
      <div className="lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="vehicle-filters"
          className="w-full justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" />
            {t.common.filters}
            {activeCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-ink-900 text-2xs text-white">
                {activeCount}
              </span>
            )}
          </span>
          {open ? <X className="size-4" /> : <span className="text-ink-300">＋</span>}
        </Button>
      </div>

      <form
        id="vehicle-filters"
        action={action}
        method="get"
        onSubmit={submit}
        className={cn(
          'mt-3 space-y-4 rounded-2xl border border-sand-200 bg-white p-4 shadow-card lg:mt-0 lg:block',
          open ? 'block' : 'hidden',
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-800">{t.vehicles.filtersTitle}</h2>
          {activeCount > 0 && (
            <a
              href={action}
              className="text-2xs font-medium uppercase tracking-[0.08em] text-gold-700 hover:underline"
            >
              {t.common.reset}
            </a>
          )}
        </div>

        <Field label={t.common.search} htmlFor="v-q">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-ink-300"
            />
            <Input
              id="v-q"
              name="q"
              defaultValue={filters.query}
              placeholder={t.common.searchPlaceholder}
              className="ps-9"
              maxLength={120}
            />
          </div>
        </Field>

        <Field label={t.vehicles.dealType} htmlFor="deal">
          <Select id="deal" name="deal" defaultValue={filters.dealTypes[0] ?? ''} onChange={onSelectChange}>
            <option value="">{t.common.all}</option>
            <option value="rent">{t.labels.dealType.rent}</option>
            <option value="sale">{t.labels.dealType.sale}</option>
            <option value="both">{t.labels.dealType.both}</option>
          </Select>
        </Field>

        <Field label={t.vehicles.category} htmlFor="v-category">
          <Select
            id="v-category"
            name="category"
            defaultValue={filters.categories[0] ?? ''}
            onChange={onSelectChange}
          >
            <option value="">{t.common.all}</option>
            {(['economy', 'sedan', 'suv', 'luxury', 'utility', 'van'] as const).map((cat) => (
              <option key={cat} value={cat}>
                {t.labels.vehicleCategory[cat]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.properties.commune} htmlFor="v-commune">
          <Select
            id="v-commune"
            name="commune"
            defaultValue={filters.communes[0] ?? ''}
            onChange={onSelectChange}
          >
            <option value="">{t.common.all}</option>
            {communes.map((commune) => (
              <option key={commune.id} value={commune.slug}>
                {pick(commune.name)}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.properties.minPrice} htmlFor="v-minPrice">
            <Input
              id="v-minPrice"
              name="minPrice"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              defaultValue={filters.minPrice ?? ''}
              placeholder="0"
            />
          </Field>
          <Field label={t.properties.maxPrice} htmlFor="v-maxPrice">
            <Input
              id="v-maxPrice"
              name="maxPrice"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              defaultValue={filters.maxPrice ?? ''}
              placeholder="—"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.vehicles.transmission} htmlFor="transmission">
            <Select
              id="transmission"
              name="transmission"
              defaultValue={filters.transmission === 'all' ? '' : filters.transmission}
              onChange={onSelectChange}
            >
              <option value="">{t.common.any}</option>
              <option value="manual">{t.labels.transmission.manual}</option>
              <option value="automatic">{t.labels.transmission.automatic}</option>
            </Select>
          </Field>
          <Field label={t.vehicles.fuel} htmlFor="fuel">
            <Select
              id="fuel"
              name="fuel"
              defaultValue={filters.fuel === 'all' ? '' : filters.fuel}
              onChange={onSelectChange}
            >
              <option value="">{t.common.any}</option>
              <option value="petrol">{t.labels.fuel.petrol}</option>
              <option value="diesel">{t.labels.fuel.diesel}</option>
              <option value="hybrid">{t.labels.fuel.hybrid}</option>
              <option value="electric">{t.labels.fuel.electric}</option>
              <option value="lpg">{t.labels.fuel.lpg}</option>
            </Select>
          </Field>
        </div>

        <Field label={t.vehicles.seats} htmlFor="seats">
          <Select id="seats" name="seats" defaultValue={filters.seats ?? ''} onChange={onSelectChange}>
            <option value="">{t.common.any}</option>
            {[2, 4, 5, 7, 9].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </Select>
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-sand-50 px-3 py-2.5 text-sm text-ink-700">
          <input
            type="checkbox"
            name="available"
            value="1"
            defaultChecked={filters.availableOnly}
            className="size-4 rounded border-sand-300 text-gold-600 focus:ring-gold-400"
          />
          {t.properties.availableOnly}
        </label>

        <Button type="submit" variant="gold" className="w-full">
          {t.common.search}
        </Button>
      </form>
    </div>
  );
}
