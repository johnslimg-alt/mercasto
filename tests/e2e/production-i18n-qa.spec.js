import { test, expect } from '@playwright/test';

const baseUrl = process.env.BASE_URL || 'https://mercasto.com';
const routes = ['/', '/autos', '/inmuebles', '/servicios', '/empleos'];
const bannedPublicCopy = /MVP|stack trace|stacktrace|En construcción|Página en construcción|Error Crítico|white screen|coming soon|under construction|lorem ipsum|localhost:|127\.0\.0\.1|ngrok/i;
const activeLocales = [
  ['es', 'ltr'], ['en', 'ltr'], ['pt', 'ltr'], ['fr', 'ltr'],
  ['zh', 'ltr'], ['ko', 'ltr'], ['de', 'ltr'], ['it', 'ltr'],
  ['ar', 'rtl'], ['ru', 'ltr'], ['ja', 'ltr'],
];
const activeLanguageCodes = activeLocales.map(([locale]) => locale);

for (const [locale, direction] of activeLocales) {
  test(`${locale} production smoke`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((language) => {
      localStorage.setItem('lang', language);
      localStorage.setItem('mercasto_language', language);
      localStorage.setItem('i18nextLng', language);
    }, locale);

    for (const route of routes) {
      await page.goto(`${baseUrl}${route}?qa=cb1fc5c`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).not.toContainText('Mercasto no pudo cargar');
      await expect(page.locator('body')).not.toContainText(bannedPublicCopy);
      const expectedHtmlLang = locale === 'es' ? 'es-MX' : locale;
      await expect(page.locator('html')).toHaveAttribute('lang', expectedHtmlLang);
      if (route === '/') {
        const options = await page.getByTestId('desktop-language-select').locator('option').evaluateAll(nodes => nodes.map(node => node.value));
        expect(options).toEqual(activeLanguageCodes);
        expect(options).not.toContain('he');
        expect(options).not.toContain('yi');
      }
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

for (const archivedLocale of ['he', 'yi']) {
  test(`legacy ${archivedLocale} storage migrates to Spanish`, async ({ page }) => {
    await page.addInitScript((language) => {
      localStorage.setItem('lang', language);
      localStorage.setItem('mercasto_language', language);
      localStorage.setItem('i18nextLng', language);
    }, archivedLocale);
    await page.goto(`${baseUrl}/?qa=archived-language`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
    await expect.poll(() => page.evaluate(() => ({
      lang: localStorage.getItem('lang'),
      product: localStorage.getItem('mercasto_language'),
    }))).toEqual({ lang: 'es', product: 'es' });
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
    await page.goto(`${baseUrl}${route}?qa=mobile`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText('Mercasto no pudo cargar');
    await expect(page.locator('body')).not.toContainText(bannedPublicCopy);
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
  }

  expect(errors).toEqual([]);
  await context.close();
});
