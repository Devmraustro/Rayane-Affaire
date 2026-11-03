import { cookies } from 'next/headers';
import { CheckCircle2, AlertTriangle, ShieldCheck, Database, FlaskConical } from 'lucide-react';
import { listCommunes } from '@/lib/db/communes';
import { countAdminUsers } from '@/lib/db/admin-users';
import { getAdminStats } from '@/lib/db/stats';
import { listAudit } from '@/lib/server/audit';
import { getSession } from '@/lib/server/session';
import { databasePath } from '@/db/client';
import { dictionaries } from '@/lib/i18n/dictionaries';
import { resolveLocale } from '@/lib/i18n/locale';
import {
  LOCALE_COOKIE,
  PHONE_NUMBER,
  WHATSAPP_NUMBER,
  CONTACT_EMAIL,
  OFFICE_ADDRESS,
} from '@/lib/config';
import { BRAND } from '@/lib/brand';
import { formatDate } from '@/lib/format';

/**
 * Settings.
 *
 * Deliberately read-only for anything that is deployment configuration: the page
 * reports what is configured and what is still missing, which is exactly the
 * hand-off information the owner needs. No fake "saved" toggles.
 */
export default async function AdminSettingsPage() {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);
  const t = dictionaries[locale];

  const session = await getSession();
  const communes = listCommunes({ activeOnly: false });
  const stats = getAdminStats();
  const admins = countAdminUsers();
  const audit = listAudit(12);

  const contactRows = [
    { label: t.contact.phone, value: PHONE_NUMBER },
    { label: t.contact.whatsapp, value: WHATSAPP_NUMBER },
    { label: t.contact.email, value: CONTACT_EMAIL },
    { label: t.contact.address, value: OFFICE_ADDRESS },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl">{t.admin.settings.title}</h1>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Brand */}
        <section className="rounded-2xl border border-sand-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink-900">{t.admin.settings.brand}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Nom" value={BRAND.name} />
            <Row label="Marché" value={`${BRAND.market.wilaya[locale]} (${BRAND.market.wilayaCode})`} />
            <Row label="Devise" value="DZD" />
            <Row label="Langues" value="Français · العربية" />
            <Row label="Depuis" value={String(BRAND.establishedYear)} />
          </dl>
          <p className="mt-3 rounded-lg bg-sand-50 px-3 py-2 text-2xs leading-4 text-ink-400">
            {t.admin.settings.brandNote}
          </p>
        </section>

        {/* Contact */}
        <section className="rounded-2xl border border-sand-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink-900">{t.admin.settings.contact}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {contactRows.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-ink-500">{row.label}</span>
                {row.value ? (
                  <span className="inline-flex items-center gap-1 font-medium text-ink-900" dir="ltr">
                    <CheckCircle2 aria-hidden="true" className="size-3.5 text-success" />
                    {row.value}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-2xs text-warning">
                    <AlertTriangle aria-hidden="true" className="size-3.5" />
                    {t.admin.settings.contactPending}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Communes */}
        <section className="rounded-2xl border border-sand-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink-900">{t.admin.settings.communes}</h2>
          <p className="mt-1 text-2xs text-ink-400">{t.admin.settings.communesNote}</p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {communes.map((commune) => (
              <li
                key={commune.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-sand-50 px-2.5 py-1.5 text-xs"
              >
                <span className="text-ink-700">
                  {commune.name[locale]} <span className="text-ink-300">({commune.name.fr})</span>
                </span>
                {commune.osmRelationId && (
                  <a
                    href={`https://www.openstreetmap.org/relation/${commune.osmRelationId}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="font-mono text-[0.625rem] text-gold-700 hover:underline"
                  >
                    OSM
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Environment */}
        <section className="rounded-2xl border border-sand-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Database aria-hidden="true" className="size-4 text-ink-400" />
            {t.admin.settings.environment}
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label={t.admin.settings.dbPath} value={databasePath()} mono />
            <Row label={t.admin.settings.account} value={`${session?.user.email ?? '—'} (${session?.user.role ?? '—'})`} />
            <Row label="Administrateurs" value={String(admins)} />
            <Row label="Communes actives" value={String(communes.filter((c) => c.active).length)} />
          </dl>
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-info-soft px-3 py-2 text-2xs leading-4 text-info">
            <ShieldCheck aria-hidden="true" className="mt-px size-3 shrink-0" />
            {locale === 'ar'
              ? 'الجلسات مخزنة مجزّأة، والكتابة محمية بـ CSRF ومسجّلة في سجل التدقيق.'
              : 'Sessions hachées, écritures protégées par CSRF et tracées dans le journal d’audit.'}
          </p>
        </section>
      </div>

      {/* Demo records */}
      <section className="rounded-2xl border border-warning/25 bg-warning-soft p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#7a5312]">
          <FlaskConical aria-hidden="true" className="size-4" />
          {t.admin.settings.demoRecords}
        </h2>
        <p className="mt-1.5 text-xs leading-5 text-[#7a5312]">{t.admin.settings.demoRecordsNote}</p>
        <p className="mt-2 text-sm font-semibold text-[#7a5312]">
          {stats.demoProperties} biens · {stats.demoVehicles} véhicules
        </p>
      </section>

      {/* Audit trail */}
      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Journal d’audit</h2>
        {audit.length === 0 ? (
          <p className="mt-3 text-xs text-ink-400">
            {locale === 'ar' ? 'لا توجد عمليات مسجلة بعد.' : 'Aucune opération enregistrée pour le moment.'}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-sand-100 text-xs">
            {audit.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="font-mono text-[0.6875rem] text-ink-500">{entry.action}</span>
                <span className="text-ink-400">{entry.actor_email ?? '—'}</span>
                <span className="text-ink-300">{formatDate(entry.created_at, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className={mono ? 'truncate font-mono text-2xs text-ink-800' : 'font-medium text-ink-900'}>
        {value}
      </dd>
    </div>
  );
}
