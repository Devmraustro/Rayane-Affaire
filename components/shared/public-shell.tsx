import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ContactFab } from '@/components/layout/whatsapp-fab';
import { listCommunes } from '@/lib/db/communes';
import { isVehicleRentalEnabled } from '@/lib/db/settings';
import { countPublicSaleVehicles } from '@/lib/db/vehicles';

/**
 * Public page chrome (header + footer + contact FAB).
 *
 * Rendered as a Server Component so the commune list and the vehicle-rental
 * flag are fetched once, on the server, and shared across every public page — no
 * client fetch waterfall. Reading the flag here means every menu in the site
 * reflects the setting without each page having to remember to pass it.
 *
 * The menus also need to know whether the sale catalogue has anything in it: with
 * rental off, `/vehicles` stays reachable only while sale stock exists.
 */
export async function PublicShell({
  children,
  transparentHeader = false,
}: {
  children: React.ReactNode;
  transparentHeader?: boolean;
}) {
  const communes = listCommunes({ activeOnly: true });
  const rentalEnabled = isVehicleRentalEnabled();
  // Only meaningful when rental is off; skipped entirely when it is on so the
  // default path costs no extra query.
  const hasSaleInventory = rentalEnabled ? true : countPublicSaleVehicles(rentalEnabled) > 0;
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        transparentOnTop={transparentHeader}
        rentalEnabled={rentalEnabled}
        hasSaleInventory={hasSaleInventory}
      />
      <main id="main" className={transparentHeader ? 'flex-1' : 'flex-1 pt-16 lg:pt-[4.5rem]'}>
        {children}
      </main>
      <SiteFooter
        communes={communes}
        rentalEnabled={rentalEnabled}
        hasSaleInventory={hasSaleInventory}
      />
      <ContactFab />
    </div>
  );
}
