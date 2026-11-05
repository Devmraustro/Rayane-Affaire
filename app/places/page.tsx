import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { SearchX } from 'lucide-react';
import { PublicShell } from '@/components/shared/public-shell';
import { PlaceCard } from '@/components/places/place-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { listCommunes } from '@/lib/db/communes';
import { listPublicPlaces } from '@/lib/db/places';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { placesText } from '@/lib/i18n/place-copy';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import type { PlaceCategory } from '@/types';

const categories: PlaceCategory[] = ['landmark','restaurant','cafe','hotel','shopping','service','culture','nature','beach','other'];
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> { const jar = await cookies(); const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value); const copy = placesText(locale); return { title: copy.title, description: copy.subtitle, alternates: { canonical: '/places' } }; }
export default async function PlacesPage({ searchParams }: Props) {
  const jar = await cookies(); const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value); const t = dictionaries[locale]; const copy = placesText(locale); const params = await searchParams;
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  const category = categories.includes(value('category') as PlaceCategory) ? value('category') as PlaceCategory : 'all';
  const page = Math.max(1, Number.parseInt(value('page'), 10) || 1);
  const results = listPublicPlaces({ query: value('q').slice(0, 200), wilayaCode: value('wilaya').slice(0, 10), commune: value('commune').slice(0, 100), category, page });
  const communes = listCommunes({ activeOnly: true }); const wilayas = [...new Map(communes.map((item) => [item.wilayaCode, item.wilaya])).entries()];
  const href = (nextPage: number) => { const query = new URLSearchParams(); if (value('q')) query.set('q', value('q')); if (value('wilaya')) query.set('wilaya', value('wilaya')); if (value('commune')) query.set('commune', value('commune')); if (category !== 'all') query.set('category', category); if (nextPage > 1) query.set('page', String(nextPage)); return `/places${query.size ? `?${query}` : ''}`; };
  return <PublicShell><div className="border-b border-sand-200 bg-white"><div className="container-page py-10"><nav className="text-xs text-ink-400"><Link href="/">{t.nav.home}</Link><span className="mx-2">/</span><span>{copy.nav}</span></nav><h1 className="mt-3 text-3xl sm:text-4xl">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm text-ink-500">{copy.subtitle}</p></div></div>
    <div className="container-page py-8">
      <form className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input aria-label={copy.search} name="q" defaultValue={value('q')} placeholder={copy.searchPlaceholder} maxLength={200} className="rounded-lg border border-sand-300 px-3 py-2 text-sm lg:col-span-2" />
        <select aria-label={copy.wilaya} name="wilaya" defaultValue={value('wilaya')} className="rounded-lg border border-sand-300 px-3 py-2 text-sm"><option value="">{copy.allWilayas}</option>{wilayas.map(([code, name]) => <option key={code} value={code}>{name[locale]}</option>)}</select>
        <select aria-label={copy.commune} name="commune" defaultValue={value('commune')} className="rounded-lg border border-sand-300 px-3 py-2 text-sm"><option value="">{copy.allCommunes}</option>{communes.map((item) => <option key={item.id} value={item.slug}>{item.name[locale]}</option>)}</select>
        <select aria-label={copy.category} name="category" defaultValue={category} className="rounded-lg border border-sand-300 px-3 py-2 text-sm"><option value="all">{copy.allCategories}</option>{categories.map((item) => <option key={item} value={item}>{copy.categories[item]}</option>)}</select>
        <button className="rounded-lg bg-ink-900 px-4 py-2 text-sm text-white">{copy.filter}</button>
      </form>
      <div className="mt-6 flex items-center justify-between border-b border-sand-200 pb-4"><p className="text-sm text-ink-500"><strong className="text-ink-900">{results.total}</strong> {copy.results}</p><Link href="/places" className="text-xs text-gold-700 hover:underline">{copy.reset}</Link></div>
      {results.items.length ? <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.items.map((place) => <li key={place.id}><PlaceCard place={place} /></li>)}</ul> : <EmptyState className="mt-8" icon={SearchX} title={copy.empty} body={copy.subtitle} action={<Link href="/places" className="rounded-full bg-ink-900 px-5 py-2.5 text-sm text-white">{copy.reset}</Link>} />}
      <Pagination page={results.page} totalPages={results.totalPages} buildHref={href} labels={{ previous: t.common.previous, next: t.common.next, page: t.common.page, of: t.common.of }} rtl={locale === 'ar'} className="mt-10" />
    </div></PublicShell>;
}
