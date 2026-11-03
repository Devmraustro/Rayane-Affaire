'use client';

import { Phone, Mail, MessageCircle, Clock, MapPin, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { InquiryForm } from '@/components/shared/inquiry-form';
import { PHONE_NUMBER, CONTACT_EMAIL, WHATSAPP_NUMBER, OFFICE_ADDRESS } from '@/lib/config';

export function ContactContent() {
  const { t, locale } = useI18n();

  const channels = [
    PHONE_NUMBER && {
      icon: Phone,
      label: t.contact.phone,
      value: PHONE_NUMBER,
      href: `tel:${PHONE_NUMBER.replace(/\s/g, '')}`,
    },
    WHATSAPP_NUMBER && {
      icon: MessageCircle,
      label: t.contact.whatsapp,
      value: `+${WHATSAPP_NUMBER}`,
      href: `https://wa.me/${WHATSAPP_NUMBER}`,
    },
    CONTACT_EMAIL && {
      icon: Mail,
      label: t.contact.email,
      value: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
    },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href: string }[];

  return (
    <div className="container-page py-10 lg:py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">{t.nav.contact}</p>
        <h1 className="mt-2.5 text-3xl sm:text-4xl">{t.contact.title}</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-500">{t.contact.subtitle}</p>
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
        <div className="space-y-5">
          {channels.length > 0 ? (
            <ul className="space-y-2.5">
              {channels.map(({ icon: Icon, label, value, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="flex items-center gap-3.5 rounded-2xl border border-sand-200 bg-white p-4 transition-colors hover:border-gold-400"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-700">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400">
                        {label}
                      </span>
                      <span className="block truncate font-medium text-ink-900" dir="ltr">
                        {value}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-warning/25 bg-warning-soft p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#7a5312]">
                <AlertCircle aria-hidden="true" className="size-4" />
                {t.contact.contactPendingTitle}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-[#7a5312]">{t.contact.contactPendingBody}</p>
            </div>
          )}

          <div className="rounded-2xl border border-sand-200 bg-white p-4">
            <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400">
              <Clock aria-hidden="true" className="size-3.5" />
              {t.contact.hours}
            </p>
            <p className="mt-1.5 text-sm text-ink-700">{t.contact.hoursValue}</p>
          </div>

          {OFFICE_ADDRESS && (
            <div className="rounded-2xl border border-sand-200 bg-white p-4">
              <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400">
                <MapPin aria-hidden="true" className="size-3.5" />
                {t.contact.address}
              </p>
              <p className="mt-1.5 text-sm text-ink-700">{OFFICE_ADDRESS}</p>
            </div>
          )}

          <p className="text-xs leading-5 text-ink-400">
            {locale === 'ar'
              ? 'تُستعمل بياناتك فقط للتواصل معك بخصوص طلبك، ولا تُباع ولا تُشارك.'
              : 'Vos coordonnées servent uniquement à vous recontacter au sujet de votre demande. Elles ne sont ni vendues ni cédées.'}
          </p>
        </div>

        <div>
          <InquiryForm intent="general" title={t.contact.formTitle} />
        </div>
      </div>
    </div>
  );
}
