import { defineConfig } from '@playwright/test';

const port = process.env.PREVIEW_PORT || '4321';
const base = process.env.BASE_PATH || '/';
const url = `http://127.0.0.1:${port}${base}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: url,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    },
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run preview -- --port ${port}`,
    url,
    reuseExistingServer: !process.env.CI,
  },
});
