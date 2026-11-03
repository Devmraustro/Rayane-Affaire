import Link from 'next/link';
import { cookies } from 'next/headers';
import { FileQuestion } from 'lucide-react';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

export default async function VehicleNotFound() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <FileQuestion aria-hidden="true" className="mx-auto size-10 text-ink-300" />
        <h1 className="mt-4 text-2xl">{t.errors.listingNotFoundTitle}</h1>
        <p className="mt-2 text-sm text-ink-500">{t.errors.listingNotFoundBody}</p>
        <Link
          href="/vehicles"
          className="mt-6 inline-block rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-800"
        >
          {t.nav.vehicles}
        </Link>
      </div>
    </div>
  );
}
