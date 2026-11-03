import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { VehicleForm } from '@/components/admin/vehicle-form';
import { getVehicleById } from '@/lib/db/vehicles';
import { listCommunes } from '@/lib/db/communes';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = getVehicleById(id);
  if (!vehicle) notFound();

  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">{t.admin.edit}</h1>
        <p className="mt-1 font-mono text-xs text-ink-400">{vehicle.reference}</p>
      </div>
      <VehicleForm communes={listCommunes({ activeOnly: true })} vehicle={vehicle} />
    </div>
  );
}
