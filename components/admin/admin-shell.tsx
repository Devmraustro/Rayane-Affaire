'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, Car, Inbox, Users, CalendarCheck, CalendarDays, Wallet,
  Settings, LogOut, Menu, X, ExternalLink, ChevronRight, ShieldCheck,
} from 'lucide-react';
import type { AdminUser } from '@/types';
import { useI18n } from '@/lib/i18n';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { Logo } from '@/components/layout/logo';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Admin shell.
 *
 * The navigation mirrors the GW IMMOBILIER dashboard information architecture
 * (listings → CRM → calendar → finances → settings) but every page behind it is
 * backed by the real database. Badges show live counts, not decoration.
 */
export function AdminShell({
  user,
  counts,
  children,
}: {
  user: AdminUser;
  counts: { inquiries: number; drafts: number };
  children: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const nav = [
    { href: '/admin', label: t.admin.nav.dashboard, icon: LayoutDashboard, exact: true },
    { href: '/admin/properties', label: t.admin.nav.properties, icon: Building2, badge: counts.drafts || undefined },
    { href: '/admin/vehicles', label: t.admin.nav.vehicles, icon: Car },
    { href: '/admin/inquiries', label: t.admin.nav.inquiries, icon: Inbox, badge: counts.inquiries || undefined },
    { href: '/admin/customers', label: t.admin.nav.customers, icon: Users },
    { href: '/admin/reservations', label: t.admin.nav.reservations, icon: CalendarCheck },
    { href: '/admin/calendar', label: t.admin.nav.calendar, icon: CalendarDays },
    { href: '/admin/finances', label: t.admin.nav.finances, icon: Wallet },
    { href: '/admin/settings', label: t.admin.nav.settings, icon: Settings },
  ];

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/admin/login');
      router.refresh();
    } catch {
      toast.error(t.common.error);
      setSigningOut(false);
    }
  };

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <Link href="/admin" className="min-w-0">
          <Logo variant="light" locale={locale} />
        </Link>
      </div>

      <nav aria-label={t.nav.menu} className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[0.8125rem] font-medium transition-colors',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              <Icon aria-hidden="true" className={cn('size-4 shrink-0', active ? 'text-gold-400' : 'text-white/40')} />
              <span className="flex-1 truncate">{label}</span>
              {badge ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-gold-500 px-1.5 text-2xs font-semibold text-ink-950">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="rounded-lg bg-white/[0.04] p-3">
          <p className="truncate text-xs font-medium text-white">{user.fullName}</p>
          <p className="mt-0.5 truncate text-2xs text-white/45" dir="ltr">
            {user.email}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2 py-0.5 text-2xs font-medium text-gold-300">
            <ShieldCheck aria-hidden="true" className="size-2.5" />
            {t.labels.role[user.role]}
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <ExternalLink aria-hidden="true" className="size-3.5" />
          {t.footer.navigation}
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <LogOut aria-hidden="true" className="size-3.5" />
          {t.auth.logout}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-sand-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-60 bg-ink-950 lg:block">{Sidebar}</aside>

      {/* Mobile drawer */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', mobileOpen ? 'block' : 'hidden')}>
        <button
          type="button"
          aria-label={t.nav.close}
          onClick={() => setMobileOpen(false)}
          className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
        />
        <aside className="absolute inset-y-0 start-0 w-64 bg-ink-950 shadow-panel animate-slide-down">
          {Sidebar}
        </aside>
      </div>

      <div className="lg:ps-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-sand-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t.nav.menu}
              className="grid size-9 place-items-center rounded-lg text-ink-600 hover:bg-sand-100 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <Breadcrumb pathname={pathname} labels={t.admin.nav} dashboard={t.admin.overview} />
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-full border border-sand-300 px-3 py-1.5 text-2xs font-medium text-ink-600 hover:border-gold-400 hover:text-gold-700 sm:inline-flex"
            >
              <ExternalLink aria-hidden="true" className="size-3" />
              {t.footer.navigation}
            </Link>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* Mobile close button when drawer is open */}
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label={t.nav.close}
          className="fixed end-4 top-4 z-[60] grid size-9 place-items-center rounded-full bg-white text-ink-700 shadow-panel lg:hidden"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function Breadcrumb({
  pathname,
  labels,
  dashboard,
}: {
  pathname: string;
  labels: Record<string, string>;
  dashboard: string;
}) {
  const segments = pathname.split('/').filter(Boolean); // ['admin', 'properties', ...]
  const current = segments[1];
  if (!current) return <span className="text-sm font-medium text-ink-900">{dashboard}</span>;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Link href="/admin" className="text-ink-400 hover:text-ink-700">
        {dashboard}
      </Link>
      <ChevronRight aria-hidden="true" className="size-3.5 text-ink-300 rtl:rotate-180" />
      <span className="font-medium text-ink-900">{labels[current] ?? current}</span>
    </div>
  );
}
