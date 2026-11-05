import { notFound } from 'next/navigation';
import { listCommunes } from '@/lib/db/communes';
import { getPlaceById } from '@/lib/db/places';
import { PlaceForm } from '@/components/admin/place-form';
export const dynamic = 'force-dynamic';
export default async function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const place = getPlaceById((await params).id); if (!place) notFound();
  return <PlaceForm communes={listCommunes({ activeOnly: true })} place={place} />;
}
