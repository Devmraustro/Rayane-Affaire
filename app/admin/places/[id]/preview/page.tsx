import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Pencil } from 'lucide-react';
import { getPlacePreviewById } from '@/lib/db/places';
import { PlaceDetail } from '@/components/places/place-detail';
import { PlaceActions } from '@/components/admin/place-actions';
import { placesText } from '@/lib/i18n/place-copy';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default async function PlacePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const place = getPlacePreviewById((await params).id); if (!place) notFound();
  const jar = await cookies(); const copy = placesText(resolveLocale(jar.get(LOCALE_COOKIE)?.value));
  return <div className="mx-auto max-w-6xl space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/admin/places/${place.id}/edit`} className="inline-flex items-center gap-2 text-xs font-medium text-ink-600"><Pencil className="size-4" />{copy.edit}</Link><PlaceActions id={place.id} status={place.status} canDelete={false} /></div><PlaceDetail place={place} preview /></div>;
}
