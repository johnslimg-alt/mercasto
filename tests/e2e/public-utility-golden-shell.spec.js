import { test, expect } from '@playwright/test';

async function installSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
  });
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/email/verify')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    if (path.endsWith('/user/notifications/list')) {
      const body = JSON.stringify([
        { id: 1, title: 'A', message: 'A', is_read: 0, created_at: '2026-09-20T12:00:00Z' },
        { id: 2, title: 'B', message: 'B', is_read: 0, created_at: '2026-09-20T12:01:00Z' },
      ]);
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    }
    if (path.endsWith('/notifications/unread-count')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"count":2}' });
    }
    if (path.endsWith('/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":7,"name":"E2E User","account_verified":true}' });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/ads')) {
      const body = JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 });
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    }
    if (path.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"banners":[]}' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

const routes = [
  ['/ayuda', 'golden-help-main'],
  ['/contacto', 'golden-contact-main'],
  ['/verificar-email?token=test-token&email=user%40example.com', 'golden-email-verification-main'],
  ['/como-funciona', 'golden-geo-source-main'],
  ['/ruta-inexistente-golden', 'golden-not-found-main'],
];

test('public utility routes share Golden chrome on desktop and mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  test.setTimeout(60_000);
  await installSession(page);
  await mockApi(page);

  for (const viewport of [
    { width: 1440, height: 900, mobile: false },
    { width: 390, height: 844, mobile: true },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const [path, mainTestId] of routes) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('golden-header')).toBeVisible();
      await expect(page.getByTestId(mainTestId)).toBeVisible();
      await expect(page.locator('.site-header')).toBeHidden();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      if (viewport.mobile) {
        await expect(page.getByTestId('golden-bottom-nav')).toBeVisible();
        await expect(page.locator('.mobile-tabbar')).toBeHidden();
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ayuda', { waitUntil: 'domcontentloaded' });
  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.getByTestId('golden-theme-toggle').click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!before);
});


test('guest auth stays on the utility route and search remains available', async ({ page }) => {
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ayuda', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('golden-desktop-search-input')).toBeVisible();
  await page.getByTestId('golden-account-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/ayuda$/);
  await page.getByTestId('auth-modal-close').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('golden-mobile-search-input')).toBeVisible();
  await page.getByTestId('golden-mobile-notifications-tab').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/ayuda$/);
});


test('active marketplace location survives navigation into a utility route', async ({ page }) => {
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/listings?state=Veracruz&location=Veracruz', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('golden-header')).toBeVisible();
  await expect(page.getByTestId('golden-location-button')).toContainText('Veracruz');

  await page.getByTestId('golden-header').getByRole('link', { name: /ayuda|help/i }).click();
  await expect(page).toHaveURL(/\/ayuda$/);
  await expect(page.getByTestId('golden-location-button')).toContainText('Veracruz');
});


test('authenticated utility shell preserves live unread notification state', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'e2e-token');
    localStorage.setItem('user', JSON.stringify({ id: 7, name: 'E2E User', account_verified: true }));
  });
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ayuda', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('golden-notifications-unread')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('golden-mobile-notifications-unread')).toBeVisible();
});
