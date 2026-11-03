'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, ShieldCheck, MessageCircle } from 'lucide-react';
import { Logo } from './logo';
import { LanguageToggle } from './language-toggle';
import { PRIMARY_NAV } from '@/lib/brand';
import { useI18n } from '@/lib/i18n';
import { PHONE_NUMBER, WHATSAPP_NUMBER } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Site header.
 *
 * Transparent over the home hero, solid after scroll. The admin entry point is
 * always visible (it is an operational requirement for the agency), but it is
 * a quiet, secondary affordance — never competing with the primary CTAs.
 */
export function SiteHeader({ transparentOnTop = false }: { transparentOnTop?: boolean }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    if (!transparentOnTop) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparentOnTop]);

  // Close the drawer on navigation.
  React.useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the mobile drawer is open.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const onDark = transparentOnTop && !scrolled;

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-all duration-300 ease-premium',
          onDark
            ? 'bg-gradient-to-b from-ink-950/55 to-transparent'
            : 'border-b border-sand-200/80 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70',
        )}
      >
        <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
          <Link
            href="/"
            aria-label={locale === 'ar' ? 'ريان أعمال — الصفحة الرئيسية' : 'RAYANE AFFAIRE — accueil'}
            className="shrink-0"
          >
            <Logo variant={onDark ? 'light' : 'dark'} locale={locale} />
          </Link>

          <nav aria-label={t.nav.menu} className="hidden items-center gap-1 lg:flex">
            {PRIMARY_NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative rounded-full px-3.5 py-2 text-[0.8125rem] font-medium transition-colors',
                    onDark
                      ? active
                        ? 'text-white'
                        : 'text-white/75 hover:text-white'
                      : active
                        ? 'text-ink-900'
                        : 'text-ink-500 hover:text-ink-900',
                  )}
                >
                  {t.nav[item.labelKey]}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3.5 -bottom-0.5 h-px bg-gold-500"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle variant={onDark ? 'dark' : 'light'} />

            <Link
              href="/admin"
              className={cn(
                'hidden items-center gap-1.5 rounded-full px-3 py-2 text-2xs font-semibold uppercase tracking-[0.1em] transition-colors sm:inline-flex',
                onDark
                  ? 'text-white/65 hover:bg-white/10 hover:text-white'
                  : 'text-ink-400 hover:bg-sand-100 hover:text-ink-700',
              )}
              title={t.nav.admin}
            >
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              <span className="hidden xl:inline">{t.nav.admin}</span>
            </Link>

            {PHONE_NUMBER ? (
              <Button asChild variant={onDark ? 'gold' : 'primary'} size="sm" className="hidden md:inline-flex">
                <a href={`tel:${PHONE_NUMBER.replace(/\s/g, '')}`}>
                  <Phone aria-hidden="true" />
                  {PHONE_NUMBER}
                </a>
              </Button>
            ) : (
              <Button asChild variant={onDark ? 'gold' : 'primary'} size="sm" className="hidden md:inline-flex">
                <Link href="/contact">{t.nav.contact}</Link>
              </Button>
            )}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? t.nav.close : t.nav.menu}
              className={cn(
                'grid size-10 place-items-center rounded-full transition-colors lg:hidden',
                onDark ? 'text-white hover:bg-white/10' : 'text-ink-700 hover:bg-sand-100',
              )}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="fixed inset-0 z-30 lg:hidden"
        aria-modal="true"
        role="dialog"
      >
        <button
          type="button"
          aria-label={t.nav.close}
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-ink-950/45 backdrop-blur-sm"
        />
        <div className="absolute inset-x-0 top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-sand-200 bg-white p-5 shadow-panel animate-slide-down">
          <nav aria-label={t.nav.menu} className="flex flex-col">
            {PRIMARY_NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-between border-b border-sand-100 py-3.5 text-[0.9375rem] font-medium',
                    active ? 'text-ink-900' : 'text-ink-600',
                  )}
                >
                  {t.nav[item.labelKey]}
                  {active && <span aria-hidden="true" className="size-1.5 rounded-full bg-gold-500" />}
                </Link>
              );
            })}
          </nav>
          <div className="mt-5 flex flex-col gap-2.5">
            {WHATSAPP_NUMBER && (
              <Button asChild variant="gold">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden="true" />
                  {t.contact.whatsapp}
                </a>
              </Button>
            )}
            {PHONE_NUMBER && (
              <Button asChild variant="outline">
                <a href={`tel:${PHONE_NUMBER.replace(/\s/g, '')}`}>
                  <Phone aria-hidden="true" />
                  {PHONE_NUMBER}
                </a>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href="/admin">
                <ShieldCheck aria-hidden="true" />
                {t.nav.admin}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
