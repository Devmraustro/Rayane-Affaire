import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/shared/public-shell';
import { ServicesContent } from '@/components/pages/services-content';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { isVehicleRentalEnabled } from '@/lib/db/settings';

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  return { title: t.services.title, description: t.services.subtitle, alternates: { canonical: '/services' } };
}

export default function ServicesPage() {
  return (
    <PublicShell>
      <ServicesContent rentalEnabled={isVehicleRentalEnabled()} />
    </PublicShell>
  );
}
