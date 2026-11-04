import Link from 'next/link';
import { cookies } from 'next/headers';
import { FileQuestion } from 'lucide-react';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

export default async function ListingNotFound() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <FileQuestion aria-hidden="true" className="mx-auto size-10 text-ink-300" />
        <h1 className="mt-4 text-2xl">{t.errors.listingNotFoundTitle}</h1>
        <p className="mt-2 text-sm text-ink-500">{t.errors.listingNotFoundBody}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/properties"
            className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-800"
          >
            {t.nav.properties}
          </Link>
          <Link
            href="/"
            className="rounded-full border border-sand-300 px-5 py-2.5 text-sm font-medium text-ink-700 hover:border-gold-400"
          >
            {t.errors.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
