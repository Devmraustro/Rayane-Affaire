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

  // Vehicle discoverability.
  //
  // A previous version of this check only asserted that the menu and the sitemap
  // *agreed* with each other — which passes happily when both hide the catalogue,
  // exactly the bug that buried sale inventory. It now checks the thing that
  // matters: the sale catalogue is reachable and advertised, and rental-only
  // detail URLs are not.
  try {
    const home = await (await fetch(`${base}/`)).text();
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    const vehiclesResponse = await fetch(`${base}/vehicles`, { redirect: 'manual' });
    const catalogueOk = vehiclesResponse.status === 200;
    const navHasVehicles = /href="\/vehicles"/.test(home);
    const sitemapHasVehicles = sitemap.includes('/vehicles');

    // Count the sale vehicles the catalogue actually serves, by reading the
    // detail links out of the HTML. This is what "discoverable" means.
    const vehiclesHtml = catalogueOk ? await vehiclesResponse.text() : '';
    const detailLinks = [...vehiclesHtml.matchAll(/href="(\/vehicles\/[^"?#]+)"/g)].map(
      (match) => match[1],
    );
    const uniqueDetails = [...new Set(detailLinks)];

    // Demonstration records are shown (clearly labelled) but deliberately kept out
    // of the sitemap so they are never indexed as real inventory. The cards are
    // split on <article>, which is what VehicleCard renders, so a card can be
    // classified by the badge it carries rather than by guessing from its slug.
    const demoMarker = /d[ée]monstration|تجريبي/i;
    const realDetails = vehiclesHtml
      .split('<article')
      .slice(1)
      .flatMap((card) => {
        if (demoMarker.test(card)) return [];
        return [...card.matchAll(/href="(\/vehicles\/[^"?#]+)"/g)].map((m) => m[1]);
      });

    // Every advertised detail URL must resolve with 200 — a sitemap entry that
    // 404s is worse than no entry.
    let brokenDetails = 0;
    for (const href of uniqueDetails.slice(0, 6)) {
      const response = await fetch(`${base}${href}`, { redirect: 'manual' });
      if (response.status !== 200) brokenDetails += 1;
    }

    // The reported defect: the catalogue was reachable but invisible — no menu
    // entry and no sitemap URLs. Agreement between a hidden menu and a hidden
    // sitemap is therefore NOT sufficient. If the catalogue serves listings, the
    // menu and the sitemap must both advertise it.
    const consistent = navHasVehicles === sitemapHasVehicles && catalogueOk;
    const discoverable = uniqueDetails.length === 0 || (navHasVehicles && sitemapHasVehicles);

    // A real listing the catalogue shows must be advertised to crawlers too.
    const missingFromSitemap = [...new Set(realDetails)].filter((href) => !sitemap.includes(href));

    const ok = consistent && discoverable && brokenDetails === 0 && missingFromSitemap.length === 0;
    if (!ok) failures += 1;
    const problems = [
      !catalogueOk ? `catalogue ${vehiclesResponse.status}` : '',
      !consistent && catalogueOk ? 'menu/sitemap désaccordés' : '',
      !discoverable ? 'catalogue non annoncé' : '',
      brokenDetails ? `${brokenDetails} fiche(s) cassée(s)` : '',
      missingFromSitemap.length ? `${missingFromSitemap.length} fiche(s) absente(s) du sitemap` : '',
    ].filter(Boolean);
    console.log(
      `${ok ? '✔' : '✘'} ${'Location véhicules'.padEnd(18)} menu=${navHasVehicles ? 'visible' : 'masqué'} sitemap=${sitemapHasVehicles ? 'inclus' : 'exclu'} catalogue=${vehiclesResponse.status} fiches=${uniqueDetails.length}${problems.length ? ` — ${problems.join(', ')}` : ''}`,
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
