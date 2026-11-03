'use client';

import Link from 'next/link';
import { MapPin, Phone, Mail, MessageCircle, ShieldCheck, Facebook, Instagram } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { BRAND, primaryNavFor } from '@/lib/brand';
import { Logo } from './logo';
import {
  PHONE_NUMBER,
  CONTACT_EMAIL,
  WHATSAPP_NUMBER,
  OFFICE_ADDRESS,
  SOCIAL_LINKS,
} from '@/lib/config';
import type { Commune } from '@/types';

/**
 * Footer.
 *
 * Every contact line renders only when it is really configured. When nothing is
 * configured yet, an explicit notice is shown instead of placeholder digits —
 * the visitor must never dial a number that does not exist.
 */
export function SiteFooter({
  communes,
  rentalEnabled = true,
}: {
  communes: Commune[];
  /** When false, the vehicle section is omitted from the footer navigation. */
  rentalEnabled?: boolean;
}) {
  const { t, locale, pick } = useI18n();
  const navItems = primaryNavFor({ rentalEnabled });
  const year = new Date().getFullYear();
  const hasContact = Boolean(PHONE_NUMBER || CONTACT_EMAIL || OFFICE_ADDRESS || WHATSAPP_NUMBER);

  return (
    <footer className="border-t border-ink-800 bg-ink-950 text-white">
      <div className="container-page py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr]">
          <div>
            <Logo variant="light" locale={locale} showTagline />
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/55">{t.footer.tagline}</p>
            <div className="mt-5 flex gap-2">
              {SOCIAL_LINKS.facebook && (
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label="Facebook"
                  className="grid size-9 place-items-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Facebook className="size-4" />
                </a>
              )}
              {SOCIAL_LINKS.instagram && (
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label="Instagram"
                  className="grid size-9 place-items-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Instagram className="size-4" />
                </a>
              )}
            </div>
          </div>

          <nav aria-label={t.footer.navigation}>
            <h2 className="text-2xs font-semibold uppercase tracking-[0.16em] text-gold-400">
              {t.footer.navigation}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {t.nav[item.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-2xs font-semibold uppercase tracking-[0.16em] text-gold-400">
              {t.footer.contact}
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {PHONE_NUMBER && (
                <li>
                  <a
                    href={`tel:${PHONE_NUMBER.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2.5 text-white/65 transition-colors hover:text-white"
                  >
                    <Phone aria-hidden="true" className="size-3.5 text-gold-500" />
                    <span dir="ltr">{PHONE_NUMBER}</span>
                  </a>
                </li>
              )}
              {WHATSAPP_NUMBER && (
                <li>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 text-white/65 transition-colors hover:text-white"
                  >
                    <MessageCircle aria-hidden="true" className="size-3.5 text-gold-500" />
                    {t.contact.whatsapp}
                  </a>
                </li>
              )}
              {CONTACT_EMAIL && (
                <li>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="inline-flex items-center gap-2.5 text-white/65 transition-colors hover:text-white"
                  >
                    <Mail aria-hidden="true" className="size-3.5 text-gold-500" />
                    <span dir="ltr">{CONTACT_EMAIL}</span>
                  </a>
                </li>
              )}
              {OFFICE_ADDRESS && (
                <li className="inline-flex items-start gap-2.5 text-white/65">
                  <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-gold-500" />
                  <span>{OFFICE_ADDRESS}</span>
                </li>
              )}
              {!hasContact && (
                <li className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs leading-5 text-white/50">
                  {t.contact.contactPendingBody}
                </li>
              )}
            </ul>
          </div>

          <div>
            <h2 className="text-2xs font-semibold uppercase tracking-[0.16em] text-gold-400">
              {t.footer.coverage}
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/55">
              {BRAND.market.wilaya[locale]} — {BRAND.market.country[locale]}
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {communes.slice(0, 6).map((commune) => (
                <li key={commune.id}>
                  <Link
                    href={`/properties?commune=${commune.slug}`}
                    className="rounded-full bg-white/[0.06] px-2.5 py-1 text-2xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {pick(commune.name)}
                  </Link>
                </li>
              ))}
              {communes.length > 6 && (
                <li className="px-2.5 py-1 text-2xs text-white/40">+{communes.length - 6}</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/40">
            © {year} {BRAND.legalName}. {t.footer.rights}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-white/40 transition-colors hover:text-white/70"
            >
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              {t.footer.adminLink}
            </Link>
            <Link
              href="/credits"
              className="text-white/40 transition-colors hover:text-white/70"
            >
              {t.footer.creditsLink}
            </Link>
            <Link href="/sitemap.xml" className="text-white/40 transition-colors hover:text-white/70">
              {t.footer.sitemapLink}
            </Link>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-white/30 transition-colors hover:text-white/60"
            >
              © OpenStreetMap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
