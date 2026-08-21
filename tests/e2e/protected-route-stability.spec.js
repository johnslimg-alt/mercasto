import { test, expect } from '@playwright/test';

const protectedRoutes = ['/post', '/profile'];

for (const route of protectedRoutes) {
  test(`anonymous ${route} keeps its return path and opens login`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}(?:[?#].*)?$`));
    await expect(page.getByRole('heading', { name: /Inicia sesión para continuar/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
}

test('mobile protected routes remain layout-stable', async ({ page }, testInfo) => {
  test.skip(!/mobile/i.test(testInfo.project.name), 'CLS gate is scoped to the mobile project');

  await page.addInitScript(() => {
    window.__mercastoProtectedRouteCls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__mercastoProtectedRouteCls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  for (const route of protectedRoutes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Inicia sesión para continuar/i })).toBeVisible();
    await page.waitForTimeout(800);

    const cls = await page.evaluate(() => window.__mercastoProtectedRouteCls || 0);
    expect(cls, `${route} cumulative layout shift`).toBeLessThan(0.1);
  }
});

test('public home does not request admin-only bundles', async ({ page }) => {
  const adminBundleRequests = [];
  page.on('request', (request) => {
    if (/AdminModerationCenter|AdvertisingHub/.test(request.url())) {
      adminBundleRequests.push(request.url());
    }
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  expect(adminBundleRequests).toEqual([]);
});
