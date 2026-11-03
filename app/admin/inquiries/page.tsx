import Link from 'next/link';
import { cookies } from 'next/headers';
import { listInquiries } from '@/lib/db/inquiries';
import { InquiryManager } from '@/components/admin/inquiry-manager';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import { LOCALE_COOKIE } from '@/lib/config';
import type { InquiryStatus } from '@/types';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminInquiriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const statusParam = typeof params.status === 'string' ? params.status : undefined;
  const status =
    statusParam && ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'].includes(statusParam)
      ? (statusParam as InquiryStatus)
      : undefined;

  const { items, total } = listInquiries({ status, pageSize: 100 });

  const tabs: { key: string; label: string }[] = [
    { key: '', label: t.common.all },
    ...(['new', 'contacted', 'qualified', 'won', 'lost', 'spam'] as InquiryStatus[]).map((key) => ({
      key,
      label: t.labels.inquiryStatus[key],
    })),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">{t.admin.nav.inquiries}</h1>
        <p className="mt-1 text-sm text-ink-500">
          {total} {t.common.results}
        </p>
      </div>

      <nav className="flex flex-wrap gap-1" aria-label="Filtres">
        {tabs.map((tab) => (
          <Link
            key={tab.key || 'all'}
            href={tab.key ? `/admin/inquiries?status=${tab.key}` : '/admin/inquiries'}
            aria-current={(status ?? '') === tab.key ? 'page' : undefined}
            className={
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors ' +
              ((status ?? '') === tab.key
                ? 'bg-ink-900 text-white'
                : 'border border-sand-300 bg-white text-ink-600 hover:border-gold-400')
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <InquiryManager inquiries={items} />
    </div>
  );
}
