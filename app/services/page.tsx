import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/shared/public-shell';
import { ServicesContent } from '@/components/pages/services-content';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { getVehicleVisibility } from '@/lib/db/settings';
import { HIDDEN_VEHICLES } from '@/lib/settings';

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  return { title: t.services.title, description: t.services.subtitle, alternates: { canonical: '/services' } };
}

export default function ServicesPage() {
  // The services page advertises a vehicle-rental service card, so it is a public
  // vehicle surface like any other and follows the same policy.
  const visibility = (() => {
    try {
      return getVehicleVisibility();
    } catch {
      return HIDDEN_VEHICLES;
    }
  })();
  return (
    <PublicShell>
      <ServicesContent
        vehiclePublicVisible={visibility.publicVisible}
        rentalEnabled={visibility.rentalEnabled}
      />
    </PublicShell>
  );
}
