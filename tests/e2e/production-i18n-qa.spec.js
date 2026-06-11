import { test, expect } from '@playwright/test';

const routes = ['/', '/autos', '/inmuebles', '/servicios', '/empleos'];
const locales = [
  ['es', 'ltr'],
  ['en', 'ltr'],
  ['ru', 'ltr'],
  ['de', 'ltr'],
  ['ar', 'rtl'],
  ['he', 'rtl'],
];

for (const [locale, direction] of locales) {
  test(`${locale} production smoke`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((language) => {
      localStorage.setItem('lang', language);
      localStorage.setItem('mercasto_language', language);
      localStorage.setItem('i18nextLng', language);
      localStorage.setItem('lang', language);
    }, locale);

    for (const route of routes) {
      await page.goto(`https://mercasto.com${route}?qa=cb1fc5c`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).not.toContainText('Mercasto no pudo cargar');
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      if (direction === 'rtl') {
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      }
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
    }

    expect(errors).toEqual([]);
  });
}

test('mobile production smoke', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const route of routes) {
    await page.goto(`https://mercasto.com${route}?qa=mobile`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText('Mercasto no pudo cargar');
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
  }

  expect(errors).toEqual([]);
  await context.close();
});
