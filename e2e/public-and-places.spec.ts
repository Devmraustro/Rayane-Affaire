import { test, expect } from '@playwright/test';
import { login, saveForm, screenshot, uploadImage } from './helpers';

test('public catalogue, inquiry, French/Arabic RTL and responsive navigation', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await screenshot(page, testInfo, 'home-fr');

  await page.goto('/properties');
  await expect(page).toHaveTitle(/Biens|Rayane/i);
  await expect(page.locator('main')).toContainText('Béjaïa');
  await screenshot(page, testInfo, 'properties-fr');

  await page.goto('/map');
  await expect(page.getByRole('heading', { name: 'Carte des biens', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText(/position|géolocalisé/i);
  await screenshot(page, testInfo, 'public-map-fr');

  await page.goto('/contact');
  await page.locator('#fullName').fill('Client E2E');
  await page.locator('#phone').fill('+213555123456');
  await page.locator('#message').fill('Demande de test automatisé, sans données client réelles.');
  await page.getByRole('checkbox', { name: /J’accepte|consentement/i }).check();
  await page.getByRole('button', { name: /Envoyer/ }).click();
  await expect(page.getByRole('status')).toContainText(/merci|reçue/i);

  await page.goto('/');
  await page.getByRole('button', { name: 'العربية', exact: true }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await screenshot(page, testInfo, 'home-ar-rtl');
  expect(errors).toEqual([]);
});

test('place CRUD, map placement, media order, verification, publication and public projection', async ({ page }, testInfo) => {
  await page.goto('/admin/places');
  await expect(page).toHaveURL(/\/admin\/login/);
  await login(page);
  await page.goto('/admin/places/new');
  await page.locator('#nameFr').fill('Place E2E vérifiée');
  await page.locator('#nameAr').fill('مكان اختباري موثق');
  await page.locator('#descriptionFr').fill('Lieu fictif créé uniquement pour la vérification navigateur.');
  await page.locator('#descriptionAr').fill('مكان تجريبي لاختبار المتصفح فقط.');
  await page.locator('#addressFr').fill('Adresse fictive E2E, Béjaïa');
  await page.locator('#addressAr').fill('عنوان تجريبي، بجاية');
  await expect(page.getByRole('application', { name: 'Localisation', exact: true })).toBeVisible();
  await page.getByRole('application', { name: 'Localisation', exact: true }).click({ position: { x: 210, y: 150 } });
  await expect(page.locator('#lat')).not.toHaveValue('');
  await expect(page.locator('#lng')).not.toHaveValue('');
  await page.locator('#coordinatePrecision').selectOption('exact');
  await saveForm(page);
  await expect(page).toHaveURL(/\/admin\/places\/[^/]+\/edit/);
  const editUrl = page.url();

  await uploadImage(page, 'place-a');
  await uploadImage(page, 'place-b');
  await expect(page.getByTestId('media-item')).toHaveCount(2);
  const secondId = await page.getByTestId('media-item').nth(1).getAttribute('data-media-id');
  const reorderResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/media' && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: `${secondId} up`, exact: true }).click();
  expect((await reorderResponse).status()).toBe(200);
  await expect(page.getByTestId('media-item').first()).toHaveAttribute('data-media-id', secondId!);
  await screenshot(page, testInfo, 'place-admin-unverified');

  await page.locator('#status').selectOption('published');
  await saveForm(page);
  await page.goto('/places');
  await page.getByRole('link', { name: /Place E2E vérifiée/ }).first().click();
  await expect(page).toHaveURL(/\/places\//);
  await expect(page.locator('main')).toContainText('Place E2E vérifiée');
  await expect(page.getByRole('link', { name: /Google Maps/i })).toHaveCount(0);
  await expect(page.locator('main')).toContainText(/position n’est pas affichée|non vérifiée/i);
  await screenshot(page, testInfo, 'place-public-unverified');

  await page.goto(editUrl);
  await page.getByRole('button', { name: /Vérifier explicitement cette position/ }).click();
  await expect(page.getByRole('button', { name: /Retirer la vérification/ })).toBeVisible();
  await page.getByRole('link', { name: /Aperçu avant publication/ }).click();
  await expect(page.locator('main')).toContainText('Place E2E vérifiée');
  await screenshot(page, testInfo, 'place-admin-preview-verified');

  await page.goto('/places');
  await page.getByRole('link', { name: /Place E2E vérifiée/ }).first().click();
  await expect(page.getByRole('link', { name: /Google Maps/i })).toHaveAttribute('href', /google\.com\/maps\/dir/);
  await expect(page.locator('main')).toContainText(/Position exacte vérifiée/i);
  await screenshot(page, testInfo, 'place-public-verified');

  await page.goto('/admin/places');
  const row = page.locator('tr').filter({ hasText: 'Place E2E vérifiée' });
  await row.getByRole('button', { name: 'Repasser en brouillon', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Publier', exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page.getByText('Place E2E vérifiée', { exact: true })).toHaveCount(0);
});

test('geocoder loading, result, empty, failure and rate-limit UI boundaries', async ({ page }, testInfo) => {
  await login(page);
  await page.goto('/admin/places/new');
  await page.locator('#geocode-query').fill('Béjaïa');
  await page.route('**/api/admin/geocode?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ json: { ok: true, data: { results: [{ id: 'mock-1', label: 'Résultat approximatif E2E', lat: 36.75, lng: 5.07, coordinatePrecision: 'approximate', verified: false }] } } });
  });
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(page.getByRole('button', { name: /Recherche/ })).toBeDisabled();
  await page.getByTestId('geocode-result').click();
  await expect(page.locator('#coordinatePrecision')).toHaveValue('approximate');
  await expect(page.locator('#lat')).toHaveValue('36.750000');
  await expect(page.locator('main')).toContainText(/Position non vérifiée/i);

  await page.unroute('**/api/admin/geocode?*');
  await page.route('**/api/admin/geocode?*', (route) => route.fulfill({ json: { ok: true, data: { results: [] } } }));
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(/Aucun résultat/i);

  await page.unroute('**/api/admin/geocode?*');
  await page.route('**/api/admin/geocode?*', (route) => route.fulfill({ status: 429, json: { ok: false, error: { code: 'GEOCODER_RATE_LIMITED' } } }));
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(/Limite du service|trop de recherches|patientez/i);
  await screenshot(page, testInfo, 'geocoder-rate-limit');

  await page.unroute('**/api/admin/geocode?*');
  await page.route('**/api/admin/geocode?*', (route) => route.fulfill({ status: 502, json: { ok: false, error: { code: 'GEOCODER_UPSTREAM' } } }));
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(/recherche.*indisponible|échec|service/i);
});
