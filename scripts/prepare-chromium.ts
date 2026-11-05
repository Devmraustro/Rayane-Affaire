import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function main() {
  if (process.env.CI || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) return;
  process.env.AWS_EXECUTION_ENV ||= 'AWS_Lambda_nodejs22.x';
  const { default: chromium } = await import('@sparticuz/chromium');
  const executable = await chromium.executablePath();
  if (!fs.existsSync(executable)) throw new Error('Chromium binary was not inflated.');
  console.log(`Chromium ready: ${executable} (${path.relative(os.tmpdir(), executable)})`);
}

void main();
