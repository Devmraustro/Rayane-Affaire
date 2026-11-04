import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/shared/public-shell';
import { AboutContent } from '@/components/pages/about-content';
import { listCommunes } from '@/lib/db/communes';
import { getVehicleVisibility } from '@/lib/db/settings';
import { HIDDEN_VEHICLES } from '@/lib/settings';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  return { title: t.about.title, description: t.about.subtitle, alternates: { canonical: '/about' } };
}

export default function AboutPage() {
  const communes = listCommunes({ activeOnly: true });
  return (
    <PublicShell>
      <AboutContent
        communes={communes}
        vehiclePublicVisible={readVisibilitySafely().publicVisible}
        rentalEnabled={readVisibilitySafely().rentalEnabled}
      />
    </PublicShell>
  );
}

/** Never let a database problem turn into a marketing claim. */
function readVisibilitySafely() {
  try {
    return getVehicleVisibility();
  } catch {
    return HIDDEN_VEHICLES;
  }
}
