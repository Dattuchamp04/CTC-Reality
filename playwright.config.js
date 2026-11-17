// End-to-end tests in headless Chromium: `npx playwright install chromium` once, then `npm run e2e`.
const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 90000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'node e2e/serve.js', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
});
