import { listCommunes } from '@/lib/db/communes';
import { PlaceForm } from '@/components/admin/place-form';
export const dynamic = 'force-dynamic';
export default function NewPlacePage() { return <PlaceForm communes={listCommunes({ activeOnly: true })} />; }
