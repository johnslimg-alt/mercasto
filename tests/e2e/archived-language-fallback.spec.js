import { expect, test } from '@playwright/test';

const archivedLanguages = ['he', 'yi'];

async function mockPublicApi(page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const archived of archivedLanguages) {
  test(`archived language ${archived} safely falls back to Spanish`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.addInitScript(lang => {
      localStorage.setItem('lang', lang);
      localStorage.setItem('mercasto_language', lang);
    }, archived);
    await mockPublicApi(page);
    await page.goto('/listings');

    await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('lang'))).toBe('es');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('mercasto_language'))).toBe('es');
    await expect(page.getByTestId('catalog-map-toggle')).toContainText('Ocultar mapa');
    const languageSelect = page.getByTestId('desktop-language-select');
    await expect(languageSelect.locator('option')).toHaveCount(11);
    await expect(languageSelect.locator('option[value="he"]')).toHaveCount(0);
    await expect(languageSelect.locator('option[value="yi"]')).toHaveCount(0);
  });
}
