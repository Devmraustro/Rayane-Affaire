import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { PropertyForm } from '@/components/admin/property-form';
import { getPropertyById } from '@/lib/db/properties';
import { listCommunes } from '@/lib/db/communes';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = getPropertyById(id);
  if (!property) notFound();

  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  const communes = listCommunes({ activeOnly: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">{t.admin.edit}</h1>
        <p className="mt-1 font-mono text-xs text-ink-400">{property.reference}</p>
      </div>
      <PropertyForm communes={communes} property={property} />
    </div>
  );
}
