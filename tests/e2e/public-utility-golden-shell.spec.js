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
  ['/safety', 'golden-geo-source-main'],
  ['/terminos', 'golden-terms-main'],
  ['/privacidad', 'golden-privacy-main'],
  ['/cookies', 'golden-cookies-main'],
  ['/moderacion', 'golden-moderation-main'],
  ['/reembolsos', 'golden-refunds-main'],
  ['/motor', 'golden-autos-main'],
  ['/inmuebles', 'golden-inmuebles-main'],
  ['/empleos', 'golden-empleos-main'],
  ['/servicios', 'golden-servicios-main'],
  ['/productos', 'golden-productos-main'],
  ['/turismo', 'golden-turismo-main'],
  ['/electronica', 'golden-category-main'],
  ['/ruta-inexistente-golden', 'golden-not-found-main'],
];

test('public utility, legal and vertical routes share Golden chrome on desktop and mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  test.setTimeout(90_000);
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
