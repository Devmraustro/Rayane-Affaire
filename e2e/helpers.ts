import { expect, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const owner = {
  email: process.env.E2E_OWNER_EMAIL || 'owner.e2e@rayane-affaire.invalid',
  password: process.env.E2E_OWNER_PASSWORD || 'E2E-Owner-2026!',
};
export const editor = {
  email: process.env.E2E_EDITOR_EMAIL || 'editor.e2e@rayane-affaire.invalid',
  password: process.env.E2E_EDITOR_PASSWORD || 'E2E-Editor-2026!',
};

export async function login(page: Page, credentials = owner, destination: 'dashboard' | 'password' = 'dashboard') {
  await page.goto('/admin/login');
  await page.locator('#email').fill(credentials.email);
  await page.locator('#password').fill(credentials.password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL(destination === 'password' ? /\/admin\/password/ : /\/admin(?:\?|$)/);
}

export async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  const directory = path.resolve('artifacts/screenshots');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `${testInfo.project.name}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name}-${name}`, { path: file, contentType: 'image/png' });
}

function crc32(input: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** A real, decodable 16×16 gold PNG with no metadata or external asset. */
const pixel = (() => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(16, 0); header.writeUInt32BE(16, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const rows = Array.from({ length: 16 }, (_, y) => Buffer.concat([
    Buffer.from([0]), ...Array.from({ length: 16 }, (_, x) => Buffer.from([190 + ((x + y) % 20), 145, 65])),
  ]));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), pngChunk('IEND', Buffer.alloc(0)),
  ]);
})();

export async function uploadImage(page: Page, suffix: string) {
  const previousCount = await page.getByTestId('media-item').count();
  await page.locator('#altFr').fill(`Photo de démonstration ${suffix}`);
  await page.locator('#altAr').fill(`صورة تجريبية ${suffix}`);
  await page.locator('#credit').fill('Rayane Affaire — image E2E générée');
  await page.locator('#license').fill('Licence interne de test');
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/admin/media' && response.request().method() === 'POST');
  await page.locator('#media-input').setInputFiles({
    name: `e2e-${suffix}.png`, mimeType: 'image/png', buffer: pixel,
  });
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(200);
  await expect(page.getByTestId('media-item')).toHaveCount(previousCount + 1);
}

export async function saveForm(page: Page) {
  const responsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return /^\/api\/admin\/(places|properties|vehicles)(\/[^/]+)?$/.test(pathname)
      && ['POST', 'PATCH'].includes(response.request().method());
  });
  await page.locator('form').first().getByRole('button', { name: /^Enregistrer(?: le lieu)?$/ }).first().click();
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBeLessThan(300);
}
