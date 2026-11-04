'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Building2, Wallet } from 'lucide-react';
import type { Commune } from '@/types';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select, Input } from '@/components/ui/input';

/**
 * Hero search panel.
 *
 * A single visible row on desktop (transaction / category / commune / budget)
 * that degrades to a stacked form on mobile. Submits as a GET to /properties so
 * the result is a real, shareable URL and works without JavaScript.
 */
export function HeroSearch({ communes }: { communes: Commune[] }) {
  const { t, pick } = useI18n();
  const router = useRouter();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const search = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const v = String(value).trim();
      if (v) search.append(key, v);
    }
    router.push(search.toString() ? `/properties?${search.toString()}` : '/properties');
  };

  return (
    <div className="mt-9 lg:mt-11">
      <form
        action="/properties"
        method="get"
        onSubmit={onSubmit}
        className="rounded-2xl border border-white/15 bg-white/95 p-3 shadow-panel backdrop-blur-xl sm:rounded-[1.375rem] sm:p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end lg:gap-2.5">
          <div className="space-y-1.5">
            <label
              htmlFor="hero-transaction"
              className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400"
            >
              <Building2 aria-hidden="true" className="size-3" />
              {t.home.searchTransaction}
            </label>
            <Select id="hero-transaction" name="transaction" className="bg-sand-50/70">
              <option value="">{t.common.all}</option>
              <option value="rent_annual">{t.labels.transaction.rent_annual}</option>
              <option value="rent_short">{t.labels.transaction.rent_short}</option>
              <option value="sale">{t.labels.transaction.sale}</option>
              <option value="exchange">{t.labels.transaction.exchange}</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="hero-category"
              className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400"
            >
              <Building2 aria-hidden="true" className="size-3" />
              {t.home.searchCategory}
            </label>
            <Select id="hero-category" name="category" className="bg-sand-50/70">
              <option value="">{t.common.all}</option>
              <option value="apartment">{t.labels.propertyCategory.apartment}</option>
              <option value="studio">{t.labels.propertyCategory.studio}</option>
              <option value="villa">{t.labels.propertyCategory.villa}</option>
              <option value="house">{t.labels.propertyCategory.house}</option>
              <option value="commercial">{t.labels.propertyCategory.commercial}</option>
              <option value="land">{t.labels.propertyCategory.land}</option>
              <option value="office">{t.labels.propertyCategory.office}</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="hero-commune"
              className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400"
            >
              <MapPin aria-hidden="true" className="size-3" />
              {t.home.searchCommune}
            </label>
            <Select id="hero-commune" name="commune" className="bg-sand-50/70">
              <option value="">{t.common.all}</option>
              {communes.map((commune) => (
                <option key={commune.id} value={commune.slug}>
                  {pick(commune.name)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="hero-budget"
              className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400"
            >
              <Wallet aria-hidden="true" className="size-3" />
              {t.home.searchBudget}
            </label>
            <Input
              id="hero-budget"
              name="maxPrice"
              type="number"
              inputMode="numeric"
              min={0}
              step={5000}
              placeholder="—"
              className="bg-sand-50/70"
            />
          </div>

          <Button type="submit" variant="primary" size="md" className="h-11 w-full lg:w-auto lg:px-6">
            <Search aria-hidden="true" />
            <span className="lg:hidden xl:inline">{t.home.searchSubmit}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
