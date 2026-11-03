import { cookies } from 'next/headers';
import { VehicleForm } from '@/components/admin/vehicle-form';
import { listCommunes } from '@/lib/db/communes';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

export default async function NewVehiclePage() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl">{t.admin.newVehicle}</h1>
      <VehicleForm communes={listCommunes({ activeOnly: true })} />
    </div>
  );
}
