import Link from 'next/link';
import { cookies } from 'next/headers';
import { Compass } from 'lucide-react';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

export default async function NotFound() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  return (
    <div className="grid min-h-dvh place-items-center bg-sand-50 px-6 text-center">
      <div>
        <Compass aria-hidden="true" className="mx-auto size-10 text-ink-300" />
        <p className="mt-4 font-display text-5xl font-semibold text-ink-900">404</p>
        <h1 className="mt-2 text-xl">{t.errors.notFoundTitle}</h1>
        <p className="mt-1.5 text-sm text-ink-500">{t.errors.notFoundBody}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-800"
        >
          {t.errors.backHome}
        </Link>
      </div>
    </div>
  );
}
