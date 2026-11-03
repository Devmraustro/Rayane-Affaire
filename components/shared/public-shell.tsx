import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ContactFab } from '@/components/layout/whatsapp-fab';
import { listCommunes } from '@/lib/db/communes';

/**
 * Public page chrome (header + footer + contact FAB).
 *
 * Rendered as a Server Component so the commune list is fetched once, on the
 * server, and shared across every public page — no client fetch waterfall.
 */
export async function PublicShell({
  children,
  transparentHeader = false,
}: {
  children: React.ReactNode;
  transparentHeader?: boolean;
}) {
  const communes = listCommunes({ activeOnly: true });
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader transparentOnTop={transparentHeader} />
      <main id="main" className={transparentHeader ? 'flex-1' : 'flex-1 pt-16 lg:pt-[4.5rem]'}>
        {children}
      </main>
      <SiteFooter communes={communes} />
      <ContactFab />
    </div>
  );
}
