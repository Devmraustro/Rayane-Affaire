import { test, expect } from '@playwright/test';
import { editor, login, saveForm, screenshot, uploadImage } from './helpers';

test('property CRUD, publication and reservation list/calendar/overlap workflow', async ({ page }, testInfo) => {
  await login(page);
  await page.goto('/admin/properties/new');
  await page.locator('#titleFr').fill('Appartement E2E');
  await page.locator('#titleAr').fill('شقة اختبارية');
  await page.locator('#descriptionFr').fill('Bien fictif pour le test navigateur.');
  await page.locator('#descriptionAr').fill('عقار تجريبي لاختبار المتصفح.');
  await page.locator('#price').fill('45000');
  await page.locator('#surface').fill('85');
  await page.locator('#bedrooms').fill('2');
  await page.locator('#bathrooms').fill('1');
  await page.locator('#coordinatePrecision').selectOption('exact');
  await page.locator('#lat').fill('36.751234');
  await page.locator('#lng').fill('5.064567');
  await saveForm(page);
  await expect(page).toHaveURL(/\/admin\/properties\/[^/]+\/edit/);
  const editUrl = page.url();
  await uploadImage(page, 'property');
  await page.locator('#status').selectOption('published');
  await saveForm(page);
  await page.goto('/properties');
  await expect(page.getByRole('link', { name: /Appartement E2E/ }).first()).toBeVisible();
  await page.getByRole('link', { name: /Appartement E2E/ }).first().click();
  await expect(page.locator('main')).toContainText('Appartement E2E');
  await screenshot(page, testInfo, 'property-public');
  await page.goto('/map');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('main')).toContainText('Appartement E2E');
  await screenshot(page, testInfo, 'property-map-marker');

  await page.goto('/admin/reservations');
  await page.getByRole('button', { name: 'Nouvelle réservation', exact: true }).click();
  const listingValue = await page.locator('#listingId option').filter({ hasText: 'Appartement E2E' }).getAttribute('value');
  await page.locator('#listingId').selectOption(listingValue!);
  await page.locator('#reservation-fullName').fill('Client réservation E2E');
  await page.locator('#reservation-phone').fill('+213555987654');
  await page.locator('#startDate').fill('2027-05-10');
  await page.locator('#endDate').fill('2027-05-15');
  await page.locator('#amount').fill('225000');
  await page.locator('#deposit').fill('45000');
  await page.getByRole('button', { name: 'Enregistrer la réservation', exact: true }).click();
  await expect(page.locator('tr').filter({ hasText: 'Client réservation E2E' })).toBeVisible();
  await screenshot(page, testInfo, 'reservation-list');

  await page.goto('/admin/calendar?month=2027-05');
  await expect(page.locator('main')).toContainText('Client réservation E2E');
  await screenshot(page, testInfo, 'reservation-calendar');

  await page.goto('/admin/reservations');
  await page.getByRole('button', { name: 'Nouvelle réservation', exact: true }).click();
  const overlapListingValue = await page.locator('#listingId option').filter({ hasText: 'Appartement E2E' }).getAttribute('value');
  await page.locator('#listingId').selectOption(overlapListingValue!);
  await page.locator('#reservation-fullName').fill('Second client E2E');
  await page.locator('#reservation-phone').fill('+213555987650');
  await page.locator('#startDate').fill('2027-05-12');
  await page.locator('#endDate').fill('2027-05-18');
  await page.locator('#amount').fill('250000');
  await page.getByRole('button', { name: 'Enregistrer la réservation', exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(/chevauche/i);

  await page.reload();
  const reservationRow = page.locator('tr').filter({ hasText: 'Client réservation E2E' });
  await reservationRow.locator('select[aria-label^="status"]').selectOption('cancelled');
  await expect(reservationRow.locator('select[aria-label^="status"]')).toHaveValue('cancelled');
  page.once('dialog', (dialog) => dialog.accept());
  await reservationRow.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page.getByText('Client réservation E2E', { exact: true })).toHaveCount(0);

  await page.goto(editUrl);
  await page.locator('#status').selectOption('archived');
  await saveForm(page);
  await page.goto('/properties');
  await expect(page.getByText('Appartement E2E', { exact: true })).toHaveCount(0);
});

test('vehicle publication is feature-flagged and media can be reordered/deleted', async ({ page }, testInfo) => {
  await login(page);
  await page.goto('/admin/vehicles/new');
  await page.locator('#titleFr').fill('Voiture E2E');
  await page.locator('#titleAr').fill('سيارة اختبارية');
  await page.locator('#brand').fill('Marque test');
  await page.locator('#model').fill('Modèle test');
  await page.locator('#dailyPrice').fill('8000');
  await saveForm(page);
  await expect(page).toHaveURL(/\/admin\/vehicles\/[^/]+\/edit/);
  const editUrl = page.url();
  await uploadImage(page, 'vehicle-a');
  await uploadImage(page, 'vehicle-b');
  await expect(page.getByTestId('media-item')).toHaveCount(2);
  await page.locator('#status').selectOption('published');
  await saveForm(page);
  await page.goto('/vehicles');
  await expect(page.getByText('Voiture E2E', { exact: true })).toHaveCount(0);
  await page.goto('/admin/settings');
  await page.getByTestId('vehicle-public-switch').click();
  await expect(page.getByTestId('vehicle-public-switch')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('vehicle-rental-switch').click();
  await expect(page.getByTestId('vehicle-rental-switch')).toHaveAttribute('aria-checked', 'true');
  await page.goto('/vehicles');
  await expect(page.getByRole('link', { name: /Voiture E2E/ }).first()).toBeVisible();
  await screenshot(page, testInfo, 'vehicles-public-enabled');

  await page.goto(editUrl);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('media-item').first().getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page.getByTestId('media-item')).toHaveCount(1);
  await page.locator('#status').selectOption('archived');
  await saveForm(page);
  await page.goto('/admin/settings');
  await page.getByTestId('vehicle-public-switch').click();
  await expect(page.getByTestId('vehicle-public-switch')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('vehicle-rental-switch').click();
  await expect(page.getByTestId('vehicle-rental-switch')).toHaveAttribute('aria-checked', 'false');
});

test('owner creates account, first login forces password change, editor RBAC and preferences persist', async ({ page }, testInfo) => {
  await login(page);
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Créer le compte', exact: true }).click();
  const email = `forced-${testInfo.project.name}-${Date.now()}@rayane-affaire.invalid`;
  await page.locator('#new-user-name').fill('Compte forcé E2E');
  await page.locator('#new-user-email').fill(email);
  await page.getByRole('button', { name: 'Créer le compte', exact: true }).last().click();
  const temporary = await page.locator('code').filter({ hasText: /./ }).first().textContent();
  expect(temporary?.length).toBeGreaterThan(15);
  await page.context().clearCookies();
  await login(page, { email, password: temporary! }, 'password');
  await expect(page).toHaveURL(/\/admin\/password/);
  await page.goto('/admin/places');
  await expect(page).toHaveURL(/\/admin\/password/);
  await page.locator('#currentPassword').fill(temporary!);
  await page.locator('#newPassword').fill('Nouveau-E2E-2026!');
  await page.locator('#confirmPassword').fill('Nouveau-E2E-2026!');
  await page.getByRole('button', { name: /Changer le mot de passe/ }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await page.context().clearCookies();
  await login(page, { email, password: 'Nouveau-E2E-2026!' });
  await page.goto('/admin/users');
  await expect(page).toHaveTitle(/Administration|Rayane/i);
  await expect(page.getByRole('button', { name: 'Créer le compte', exact: true })).toHaveCount(0);
  await screenshot(page, testInfo, 'editor-rbac');

  await page.goto('/admin/notifications');
  const inquiry = page.locator('input[type="checkbox"]').first();
  await inquiry.check();
  await expect(inquiry).toBeChecked();
  await page.getByRole('button', { name: 'Enregistrer les préférences', exact: true }).click();
  await expect(page.getByText('Préférences enregistrées', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('input[type="checkbox"]').first()).toBeChecked();
  await screenshot(page, testInfo, 'notification-preferences');

  await page.context().clearCookies();
  await login(page, editor);
  await page.goto('/admin/users');
  await expect(page.getByRole('button', { name: 'Créer le compte', exact: true })).toHaveCount(0);
  const response = await page.request.post('/api/admin/users', {
    headers: { 'Content-Type': 'application/json', Origin: new URL(page.url()).origin },
    data: { email: `forbidden-${testInfo.project.name}@rayane-affaire.invalid`, fullName: 'Interdit E2E', role: 'owner' },
  });
  expect(response.status()).toBe(403);
});
