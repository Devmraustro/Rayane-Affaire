import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { PublicShell } from '@/components/shared/public-shell';
import { ContactContent } from '@/components/pages/contact-content';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];
  return { title: t.contact.title, description: t.contact.subtitle, alternates: { canonical: '/contact' } };
}

export default function ContactPage() {
  return (
    <PublicShell>
      <ContactContent />
    </PublicShell>
  );
}
