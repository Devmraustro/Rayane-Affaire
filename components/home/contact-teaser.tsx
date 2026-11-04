'use client';

import Link from 'next/link';
import { Phone, Mail, MessageCircle, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { PHONE_NUMBER, CONTACT_EMAIL, WHATSAPP_NUMBER } from '@/lib/config';

/** Closing conversion block: the three ways to reach the agency, honestly. */
export function ContactTeaser() {
  const { t, dir } = useI18n();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const channels = [
    PHONE_NUMBER && {
      icon: Phone,
      label: t.contact.phone,
      value: PHONE_NUMBER,
      href: `tel:${PHONE_NUMBER.replace(/\s/g, '')}`,
      ltr: true,
    },
    WHATSAPP_NUMBER && {
      icon: MessageCircle,
      label: t.contact.whatsapp,
      value: `+${WHATSAPP_NUMBER}`,
      href: `https://wa.me/${WHATSAPP_NUMBER}`,
      ltr: true,
    },
    CONTACT_EMAIL && {
      icon: Mail,
      label: t.contact.email,
      value: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
      ltr: true,
    },
  ].filter(Boolean) as {
    icon: typeof Phone;
    label: string;
    value: string;
    href: string;
    ltr: boolean;
  }[];

  return (
    <section className="relative overflow-hidden bg-ink-950 py-16 text-white sm:py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_120%,rgba(217,166,34,0.18),transparent_55%)]"
      />
      <div className="container-page relative grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="eyebrow text-gold-400">{t.contact.title}</p>
          <h2 className="mt-3 max-w-xl text-2xl text-white sm:text-3xl lg:text-[2.125rem] lg:leading-[1.15]">
            {t.home.contactTitle}
          </h2>
          <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-white/65">
            {t.home.contactSub}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="lg">
              <Link href="/contact">
                {t.contact.formTitle}
                <Arrow aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/25 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              <Link href="/properties">{t.nav.properties}</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:p-6">
          <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-gold-400">
            {t.footer.contact}
          </p>
          {channels.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {channels.map(({ icon: Icon, label, value, href, ltr }) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3.5 py-3 text-sm transition-colors hover:bg-white/[0.08]"
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0 text-gold-400" />
                    <span className="flex flex-1 flex-col">
                      <span className="text-2xs uppercase tracking-[0.1em] text-white/40">{label}</span>
                      <span className="font-medium text-white" dir={ltr ? 'ltr' : undefined}>
                        {value}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-xs leading-5 text-white/55">
              {t.contact.contactPendingBody}
            </p>
          )}
          <p className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/45">
            <Clock aria-hidden="true" className="size-3.5 text-gold-500" />
            {t.contact.hoursValue}
          </p>
        </div>
      </div>
    </section>
  );
}
