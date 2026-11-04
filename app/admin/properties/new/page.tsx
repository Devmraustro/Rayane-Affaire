import { cookies } from 'next/headers';
import { PropertyForm } from '@/components/admin/property-form';
import { listCommunes } from '@/lib/db/communes';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

export default async function NewPropertyPage() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  const communes = listCommunes({ activeOnly: true });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl">{t.admin.newProperty}</h1>
      <PropertyForm communes={communes} />
    </div>
  );
}
