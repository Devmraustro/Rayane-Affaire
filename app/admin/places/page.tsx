import Link from 'next/link';
import { cookies } from 'next/headers';
import { MapPin, Plus } from 'lucide-react';
import { listAdminPlaces } from '@/lib/db/admin-places';
import { getSession } from '@/lib/server/session';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { placesText } from '@/lib/i18n/place-copy';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { roleSatisfies } from '@/lib/server/authz';
import { Badge } from '@/components/ui/badge';
import { PlaceActions } from '@/components/admin/place-actions';

export const dynamic = 'force-dynamic';
export default async function AdminPlacesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const jar = await cookies(); const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value); const t = dictionaries[locale]; const copy = placesText(locale);
  const params = await searchParams; const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  const session = await getSession();
  const places = listAdminPlaces({ status: value('status'), query: value('q'), location: value('location') });
  const canDelete = session ? roleSatisfies(session.user.role, 'manager') : false;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl">{copy.list}</h1><p className="mt-1 text-sm text-ink-500">{places.length} {copy.results}</p></div><Link href="/admin/places/new" className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-4 py-2 text-xs font-semibold text-ink-950 hover:bg-gold-400"><Plus className="size-4" />{copy.new}</Link></div>
    <form className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
      <input name="q" defaultValue={value('q')} placeholder={copy.searchPlaceholder} className="rounded-lg border border-sand-300 px-3 py-2 text-sm lg:col-span-2" />
      <select name="status" defaultValue={value('status') || 'all'} className="rounded-lg border border-sand-300 px-3 py-2 text-sm"><option value="all">{copy.status}</option><option value="draft">{copy.draft}</option><option value="published">{copy.published}</option><option value="archived">{copy.archived}</option></select>
      <select name="location" defaultValue={value('location') || 'all'} className="rounded-lg border border-sand-300 px-3 py-2 text-sm"><option value="all">{copy.location}</option><option value="missing">{copy.locationMissing}</option><option value="unverified">{copy.locationUnverified}</option><option value="verified">{copy.locationVerified}</option></select>
      <button className="rounded-lg bg-ink-900 px-4 py-2 text-sm text-white">{copy.filter}</button>
    </form>
    {places.length === 0 ? <div className="rounded-2xl border border-dashed border-sand-300 bg-white px-6 py-14 text-center"><MapPin className="mx-auto size-8 text-ink-300" /><p className="mt-3 text-sm text-ink-500">{copy.emptyAdmin}</p></div> : <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white"><table className="w-full min-w-[960px] text-sm"><thead><tr className="border-b border-sand-200 bg-sand-50 text-2xs uppercase tracking-wider text-ink-400"><th className="px-4 py-3 text-start">{t.admin.table.reference}</th><th className="px-4 py-3 text-start">{copy.title}</th><th className="px-4 py-3 text-start">{copy.commune}</th><th className="px-4 py-3 text-start">{copy.location}</th><th className="px-4 py-3 text-start">{copy.status}</th><th className="px-4 py-3 text-start">{copy.images}</th><th className="px-4 py-3 text-start">{t.admin.table.actions}</th></tr></thead><tbody className="divide-y divide-sand-100">{places.map((place) => <tr key={place.id}><td className="px-4 py-3 font-mono text-xs">{place.reference}</td><td className="px-4 py-3"><p className="font-medium text-ink-800">{place.nameFr}</p><p dir="rtl" className="text-xs text-ink-400">{place.nameAr}</p><p className="mt-1 text-2xs text-ink-400">{copy.categories[place.category]}</p></td><td className="px-4 py-3 text-xs">{place.commune}<span className="block text-ink-400">{place.wilaya}</span></td><td className="px-4 py-3"><Badge tone={place.locationStatus === 'verified' ? 'success' : place.locationStatus === 'unverified' ? 'warning' : 'neutral'}>{place.locationStatus === 'verified' ? copy.locationVerified : place.locationStatus === 'unverified' ? copy.locationUnverified : copy.locationMissing}</Badge></td><td className="px-4 py-3"><Badge tone={place.status === 'published' ? 'success' : place.status === 'archived' ? 'neutral' : 'warning'}>{copy[place.status]}</Badge></td><td className="px-4 py-3 text-xs">{place.mediaCount}</td><td className="px-4 py-3"><PlaceActions id={place.id} status={place.status} canDelete={canDelete} /></td></tr>)}</tbody></table></div>}
  </div>;
}
