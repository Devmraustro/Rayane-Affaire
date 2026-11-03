/**
 * Post-deploy smoke check: `npm run smoke -- https://your-domain`
 *
 * Verifies the public surface an owner would notice immediately — every route
 * answers, admin is gated, the sitemap is reachable and no page reports a
 * placeholder phone number. Read-only, safe to run against production.
 */
const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

interface Check {
  path: string;
  expect: number[];
  label: string;
}

const checks: Check[] = [
  { path: '/', expect: [200], label: 'Accueil' },
  { path: '/properties', expect: [200], label: 'Biens' },
  { path: '/vehicles', expect: [200], label: 'Véhicules' },
  { path: '/map', expect: [200], label: 'Carte' },
  { path: '/services', expect: [200], label: 'Services' },
  { path: '/about', expect: [200], label: 'À propos' },
  { path: '/contact', expect: [200], label: 'Contact' },
  { path: '/credits', expect: [200], label: 'Crédits' },
  { path: '/robots.txt', expect: [200], label: 'robots.txt' },
  { path: '/sitemap.xml', expect: [200], label: 'sitemap.xml' },
  { path: '/admin', expect: [307, 308], label: 'Admin (protégé)' },
  { path: '/admin/login', expect: [200], label: 'Connexion admin' },
  { path: '/route-inexistante', expect: [404], label: 'Page 404' },
  // Soft-404 guard: a missing listing detail must answer 404, not 200 with a
  // "not found" body. A root `loading.tsx` used to break exactly this.
  { path: '/properties/annonce-inexistante-verification', expect: [404], label: 'Bien absent' },
  { path: '/vehicles/vehicule-inexistant-verification', expect: [404], label: 'Véhicule absent' },
];

async function main(): Promise<void> {
  let failures = 0;
  console.log(`Smoke check → ${base}\n`);

  for (const check of checks) {
    try {
      const response = await fetch(`${base}${check.path}`, { redirect: 'manual' });
      const pass = check.expect.includes(response.status);
      if (!pass) failures += 1;
      console.log(`${pass ? '✔' : '✘'} ${check.label.padEnd(18)} ${check.path} → ${response.status}`);
    } catch (error) {
      failures += 1;
      console.log(`✘ ${check.label.padEnd(18)} ${check.path} → ${(error as Error).message}`);
    }
  }

  // The vehicle section must be either fully present or fully absent, depending
  // on the setting — a menu link pointing at a catalogue that hides everything
  // (or a catalogue reachable only by URL) would be a broken promise.
  try {
    const home = await (await fetch(`${base}/`)).text();
    const navHasVehicles = /href="\/vehicles"/.test(home);
    const vehiclesPage = await fetch(`${base}/vehicles`, { redirect: 'manual' });
    // Reachable by URL either way (sale listings may exist), so assert the menu
    // and the sitemap agree with each other.
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    const sitemapHasVehicles = sitemap.includes('/vehicles');
    if (navHasVehicles !== sitemapHasVehicles) failures += 1;
    console.log(
      `${navHasVehicles === sitemapHasVehicles ? '✔' : '✘'} ${'Location véhicules'.padEnd(18)} menu=${navHasVehicles ? 'visible' : 'masqué'} sitemap=${sitemapHasVehicles ? 'inclus' : 'exclu'} (catalogue ${vehiclesPage.status})`,
    );
  } catch {
    failures += 1;
  }

  // A placeholder phone number must never reach production.
  try {
    const html = await (await fetch(`${base}/contact`)).text();
    const placeholder = /\+213\s?00\s?00\s?00\s?00/.test(html);
    if (placeholder) failures += 1;
    console.log(`${placeholder ? '✘' : '✔'} ${'Contacts'.padEnd(18)} aucun numéro factice`);
  } catch {
    failures += 1;
  }

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
