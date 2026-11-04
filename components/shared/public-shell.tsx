import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ContactFab } from '@/components/layout/whatsapp-fab';
import { listCommunes } from '@/lib/db/communes';
import { getVehicleVisibility } from '@/lib/db/settings';
import { countPublicSaleVehicles } from '@/lib/db/vehicles';

/**
 * Public page chrome (header + footer + contact FAB).
 *
 * Rendered as a Server Component so the commune list and the vehicle policy are
 * resolved once, on the server, and shared across every public page — no client
 * fetch waterfall. Reading the policy here means every menu on the site reflects
 * it without each page having to remember to pass it.
 *
 * The menus also need to know whether the (visible) sale catalogue has anything in
 * it: with rental off, `/vehicles` stays reachable only while sale stock exists.
 * When the whole section is hidden, no query is made at all.
 */
export async function PublicShell({
  children,
  transparentHeader = false,
}: {
  children: React.ReactNode;
  transparentHeader?: boolean;
}) {
  const communes = listCommunes({ activeOnly: true });
  const visibility = getVehicleVisibility();
  // Skipped entirely while the section is hidden, and while rental is on (the
  // entry is unconditional then), so the common path costs no extra query.
  const hasSaleInventory =
    !visibility.publicVisible || visibility.rentalEnabled
      ? visibility.publicVisible
      : countPublicSaleVehicles(visibility.rentalEnabled) > 0;
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        transparentOnTop={transparentHeader}
        vehiclePublicVisible={visibility.publicVisible}
        rentalEnabled={visibility.rentalEnabled}
        hasSaleInventory={hasSaleInventory}
      />
      <main id="main" className={transparentHeader ? 'flex-1' : 'flex-1 pt-16 lg:pt-[4.5rem]'}>
        {children}
      </main>
      <SiteFooter
        communes={communes}
        vehiclePublicVisible={visibility.publicVisible}
        rentalEnabled={visibility.rentalEnabled}
        hasSaleInventory={hasSaleInventory}
      />
      <ContactFab />
    </div>
  );
}
