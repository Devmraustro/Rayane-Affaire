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
  // Either the whole section is public (200) or hidden (404). Which one is a
  // client decision; the state-consistency block below checks that the rest of
  // the surface agrees with it.
  { path: '/vehicles', expect: [200, 404], label: 'Véhicules' },
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

  // Vehicle section coherence.
  //
  // Two states are legitimate and this check accepts both, but only if the whole
  // surface agrees: a hidden section must be invisible *everywhere* (menu,
  // sitemap, cards, metadata), and a public one must be reachable everywhere. The
  // reported defect was a catalogue nobody could find, which is why disagreement
  // — in either direction — is a failure rather than a warning.
  try {
    const home = await (await fetch(`${base}/`)).text();
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    const vehiclesResponse = await fetch(`${base}/vehicles`, { redirect: 'manual' });
    const status = vehiclesResponse.status;
    const navHasVehicles = /href="\/vehicles"/.test(home);
    const sitemapHasVehicles = sitemap.includes('/vehicles');
    const homeMentionsVehicles = /href="\/vehicles"|v[ée]hicule|voiture|سيار/i.test(home);

    if (status === 404) {
      // Hidden: nothing may advertise the section, and a detail URL must 404 too.
      const detail = await fetch(`${base}/vehicles/verification-slug-quelconque`, {
        redirect: 'manual',
      });
      const ok =
        !navHasVehicles && !sitemapHasVehicles && !homeMentionsVehicles && detail.status === 404;
      if (!ok) failures += 1;
      const problems = [
        navHasVehicles ? 'lien dans le menu' : '',
        sitemapHasVehicles ? 'URL dans le sitemap' : '',
        homeMentionsVehicles ? 'mention sur l’accueil' : '',
        detail.status !== 404 ? `fiche ${detail.status}` : '',
      ].filter(Boolean);
      console.log(
        `${ok ? '✔' : '✘'} ${'Section véhicules'.padEnd(18)} masquée catalogue=${status} menu=${navHasVehicles ? 'visible' : 'masqué'} sitemap=${sitemapHasVehicles ? 'inclus' : 'exclu'}${problems.length ? ` — ${problems.join(', ')}` : ''}`,
      );
    } else if (status === 200) {
      const vehiclesHtml = await vehiclesResponse.text();
      const detailLinks = [...vehiclesHtml.matchAll(/href="(\/vehicles\/[^"?#]+)"/g)].map(
        (match) => match[1],
      );
      const uniqueDetails = [...new Set(detailLinks)];

      // Demonstration records are shown (clearly labelled) but kept out of the
      // sitemap so they are never indexed as real inventory.
      const demoMarker = /d[ée]monstration|تجريبي/i;
      const realDetails = vehiclesHtml
        .split('<article')
        .slice(1)
        .flatMap((card) => {
          if (demoMarker.test(card)) return [];
          return [...card.matchAll(/href="(\/vehicles\/[^"?#]+)"/g)].map((m) => m[1]);
        });

      let brokenDetails = 0;
      for (const href of uniqueDetails.slice(0, 6)) {
        const response = await fetch(`${base}${href}`, { redirect: 'manual' });
        if (response.status !== 200) brokenDetails += 1;
      }

      const discoverable = uniqueDetails.length === 0 || (navHasVehicles && sitemapHasVehicles);
      const missingFromSitemap = [...new Set(realDetails)].filter((href) => !sitemap.includes(href));
      const ok = discoverable && brokenDetails === 0 && missingFromSitemap.length === 0;
      if (!ok) failures += 1;
      const problems = [
        !discoverable ? 'catalogue annoncé de façon incomplète' : '',
        brokenDetails ? `${brokenDetails} fiche(s) cassée(s)` : '',
        missingFromSitemap.length ? `${missingFromSitemap.length} fiche(s) absente(s) du sitemap` : '',
      ].filter(Boolean);
      console.log(
        `${ok ? '✔' : '✘'} ${'Section véhicules'.padEnd(18)} publique catalogue=200 menu=${navHasVehicles ? 'visible' : 'masqué'} sitemap=${sitemapHasVehicles ? 'inclus' : 'exclu'} fiches=${uniqueDetails.length}${problems.length ? ` — ${problems.join(', ')}` : ''}`,
      );
    } else {
      failures += 1;
      console.log(`✘ ${'Section véhicules'.padEnd(18)} catalogue=${status} (attendu 200 ou 404)`);
    }
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
