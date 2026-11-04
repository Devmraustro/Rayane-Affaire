'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import type { Commune, PropertyFilters } from '@/types';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input, Select, Field } from '@/components/ui/input';
import { countActiveFilters } from '@/lib/filters';
import { cn } from '@/lib/utils';

/**
 * Property filter panel.
 *
 * A plain `<form method="get">`: it works with JavaScript disabled, is
 * server-rendered, and produces shareable URLs. Selects submit on change for
 * convenience; the explicit button remains the accessible path.
 */
export function PropertyFiltersPanel({
  communes,
  filters,
}: {
  communes: Commune[];
  filters: PropertyFilters;
}) {
  const { t, locale, pick } = useI18n();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const activeCount = countActiveFilters(filters);
  const action = '/properties';

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
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="property-filters"
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
        id="property-filters"
        action={action}
        method="get"
        onSubmit={submit}
        className={cn(
          'mt-3 space-y-4 rounded-2xl border border-sand-200 bg-white p-4 shadow-card lg:mt-0 lg:block',
          open ? 'block' : 'hidden',
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-800">{t.properties.filtersTitle}</h2>
          {activeCount > 0 && (
            <a
              href={action}
              className="text-2xs font-medium uppercase tracking-[0.08em] text-gold-700 hover:underline"
            >
              {t.common.reset}
            </a>
          )}
        </div>

        <Field label={t.common.search} htmlFor="q">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-ink-300"
            />
            <Input
              id="q"
              name="q"
              defaultValue={filters.query}
              placeholder={t.common.searchPlaceholder}
              className="ps-9"
              maxLength={120}
            />
          </div>
        </Field>

        <Field label={t.properties.transaction} htmlFor="transaction">
          <Select
            id="transaction"
            name="transaction"
            defaultValue={filters.transactions[0] ?? ''}
            onChange={onSelectChange}
          >
            <option value="">{t.common.all}</option>
            {(['rent_annual', 'rent_short', 'sale', 'exchange'] as const).map((tx) => (
              <option key={tx} value={tx}>
                {t.labels.transaction[tx]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.properties.category} htmlFor="category">
          <Select
            id="category"
            name="category"
            defaultValue={filters.categories[0] ?? ''}
            onChange={onSelectChange}
          >
            <option value="">{t.common.all}</option>
            {(['apartment', 'studio', 'villa', 'house', 'commercial', 'land', 'office'] as const).map(
              (cat) => (
                <option key={cat} value={cat}>
                  {t.labels.propertyCategory[cat]}
                </option>
              ),
            )}
          </Select>
        </Field>

        <Field label={t.properties.commune} htmlFor="commune">
          <Select
            id="commune"
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
          <Field label={t.properties.minPrice} htmlFor="minPrice">
            <Input
              id="minPrice"
              name="minPrice"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              defaultValue={filters.minPrice ?? ''}
              placeholder="0"
            />
          </Field>
          <Field label={t.properties.maxPrice} htmlFor="maxPrice">
            <Input
              id="maxPrice"
              name="maxPrice"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              defaultValue={filters.maxPrice ?? ''}
              placeholder="—"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.properties.bedrooms} htmlFor="bedrooms">
            <Select id="bedrooms" name="bedrooms" defaultValue={filters.bedrooms ?? ''} onChange={onSelectChange}>
              <option value="">{t.common.any}</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.properties.surfaceMin} htmlFor="surfaceMin">
            <Input
              id="surfaceMin"
              name="surfaceMin"
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              defaultValue={filters.surfaceMin ?? ''}
              placeholder="—"
            />
          </Field>
        </div>

        <Field label={t.properties.furnishing} htmlFor="furnishing">
          <Select
            id="furnishing"
            name="furnishing"
            defaultValue={filters.furnishing === 'all' ? '' : filters.furnishing}
            onChange={onSelectChange}
          >
            <option value="">{t.common.any}</option>
            <option value="furnished">{t.labels.furnishing.furnished}</option>
            <option value="semi_furnished">{t.labels.furnishing.semi_furnished}</option>
            <option value="unfurnished">{t.labels.furnishing.unfurnished}</option>
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

        <p className="text-center text-2xs text-ink-300">
          {locale === 'ar' ? 'الأسعار بالدينار الجزائري' : 'Prix en dinars algériens'}
        </p>
      </form>
    </div>
  );
}
