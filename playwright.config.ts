import { defineConfig } from '@playwright/test';

/**
 * The sandbox cannot download browsers from Playwright's CDN. Local runs use
 * the packaged Chromium binary and its bundled NSS/NSPR libraries. CI can set
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH or CI=1 after `playwright install chromium`.
 */
let PackagedChromium: typeof import('@sparticuz/chromium').default | undefined;
if (!process.env.CI && !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  // @sparticuz/chromium only inflates its Linux shared libraries when it detects
  // a Lambda-compatible runtime. This affects the local test process only.
  process.env.AWS_EXECUTION_ENV ||= 'AWS_Lambda_nodejs22.x';
  // Playwright loads this config as CommonJS; require after setting the runtime
  // marker so the package inflates its shared-library archive as well.
  PackagedChromium = (require('@sparticuz/chromium') as typeof import('@sparticuz/chromium')).default;
}
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (PackagedChromium ? require('node:path').join(require('node:os').tmpdir(), 'chromium') : undefined);
// Local desktop Chromium is more stable with its normal renderer processes;
// Lambda's single-process/no-zygote flags are only needed in that environment.
const launchArgs = (PackagedChromium?.args ?? []).filter((arg) => !['--single-process', '--no-zygote'].includes(arg));

export default defineConfig({
  testDir: './e2e',
  outputDir: './artifacts/playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'artifacts/playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3100',
    headless: true,
    launchOptions: { executablePath, args: launchArgs },
    locale: 'fr-FR',
    timezoneId: 'Africa/Algiers',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Screenshots and traces are retained without Playwright's separate FFmpeg
    // download (which is blocked in the sandbox).
    video: 'off',
  },
  projects: [
    { name: 'desktop-chromium', use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: 'mobile-chromium',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npx tsx scripts/e2e-setup.ts && npm run db:seed:demo && npm run build && npm start -- --port 3100',
    url: 'http://127.0.0.1:3100/admin/login',
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_PATH: './data/e2e.db',
      UPLOAD_DIR: './data/e2e-uploads',
      NODE_ENV: 'production',
      SESSION_SECRET: 'e2e-only-session-secret-not-for-production-2026',
      E2E_OWNER_EMAIL: 'owner.e2e@rayane-affaire.invalid',
      E2E_OWNER_PASSWORD: 'E2E-Owner-2026!',
      E2E_EDITOR_EMAIL: 'editor.e2e@rayane-affaire.invalid',
      E2E_EDITOR_PASSWORD: 'E2E-Editor-2026!',
      EMAIL_DELIVERY: 'console',
    },
  },
});
