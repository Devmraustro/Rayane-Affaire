import Link from 'next/link';
import { cookies } from 'next/headers';
import { FileQuestion } from 'lucide-react';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import { getVehicleVisibility } from '@/lib/db/settings';
import { HIDDEN_VEHICLES } from '@/lib/settings';

/**
 * Shown when a vehicle detail URL resolves to nothing — a missing slug, a
 * rental-only listing while rental is off, or the whole section being hidden.
 *
 * The "back to vehicles" button is only rendered while the catalogue is public;
 * otherwise it would link to a page that now 404s, which is the sort of dead end
 * a visitor must never meet. The generic properties link is always a valid exit.
 */
export default async function VehicleNotFound() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const visibility = (() => {
    try {
      return getVehicleVisibility();
    } catch {
      return HIDDEN_VEHICLES;
    }
  })();

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <FileQuestion aria-hidden="true" className="mx-auto size-10 text-ink-300" />
        <h1 className="mt-4 text-2xl">{t.errors.listingNotFoundTitle}</h1>
        <p className="mt-2 text-sm text-ink-500">{t.errors.listingNotFoundBody}</p>
        <Link
          href={visibility.publicVisible ? '/vehicles' : '/properties'}
          className="mt-6 inline-block rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-800"
        >
          {visibility.publicVisible ? t.nav.vehicles : t.nav.properties}
        </Link>
      </div>
    </div>
  );
}
