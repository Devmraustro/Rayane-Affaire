import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/shared/public-shell';
import { PlaceDetail } from '@/components/places/place-detail';
import { getPublicPlaceBySlug } from '@/lib/db/places';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { placesText } from '@/lib/i18n/place-copy';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

type Props = { params: Promise<{ slug: string }> };
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: Props): Promise<Metadata> { const place = getPublicPlaceBySlug((await params).slug); if (!place) return { title: '404' }; return { title: place.name.fr, description: place.description.fr.slice(0, 160), alternates: { canonical: `/places/${place.slug}` }, robots: place.isDemo ? { index: false, follow: false } : undefined }; }
export default async function PlacePage({ params }: Props) {
  const place = getPublicPlaceBySlug((await params).slug); if (!place) notFound();
  const jar = await cookies(); const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value); const t = dictionaries[locale]; const copy = placesText(locale);
  return <PublicShell><div className="container-page py-8"><nav className="mb-5 text-xs text-ink-400"><Link href="/">{t.nav.home}</Link><span className="mx-2">/</span><Link href="/places">{copy.nav}</Link><span className="mx-2">/</span><span className="text-ink-600">{place.name[locale]}</span></nav><PlaceDetail place={place} /></div></PublicShell>;
}
