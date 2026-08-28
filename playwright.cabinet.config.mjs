import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:15173';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-layout-cabinet',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile-cabinet',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'webkit-desktop-cabinet',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'webkit-mobile-cabinet',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
