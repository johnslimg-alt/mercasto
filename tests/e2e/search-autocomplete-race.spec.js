import { test, expect } from '@playwright/test';

async function installGoldenSearchState(page, lang = 'es') {
  await page.addInitScript((savedLang) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('i18nextLng', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }, lang);

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const json = (value) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(value),
    });
    if (url.pathname.endsWith('/ads')) return json({ data: [], total: 0, current_page: 1, last_page: 1 });
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes') || url.pathname.endsWith('/favorites')) return json([]);
    if (url.pathname.endsWith('/banners')) return json({ banners: [] });
    if (url.pathname.endsWith('/auth/providers')) return json({ google: false, apple: false, sms: false });
    return json({});
  });
}

async function expectSearchParam(page, expected) {
  await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe(expected);
}

test('Golden catalog search is isolated from stale legacy suggestion responses', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  let suggestionRequests = 0;

  await page.route('**/api/search/suggestions?**', async (route) => {
    suggestionRequests += 1;
    const query = new URL(route.request().url()).searchParams.get('q');
    await new Promise(resolve => setTimeout(resolve, query === 'iphone' ? 900 : 50));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([query === 'iphone' ? 'iPhone viejo' : 'iPad nuevo']),
    });
  });
  await installGoldenSearchState(page);

  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  const input = page.getByTestId('catalog-primary-search');
  await expect(input).toBeVisible();
  await input.fill('iphone');
  await page.waitForTimeout(320);
  await input.fill('ipad');
  await input.press('Enter');

  await expectSearchParam(page, 'ipad');
  await expect(input).toHaveValue('ipad');
  expect(suggestionRequests).toBe(0);
  await expect(page.getByRole('button', { name: /iPhone viejo|iPad nuevo/i })).toHaveCount(0);
});

const SEARCH_COPY = {
  en: { placeholder: 'Search on mercasto.com', dir: 'ltr' },
  ru: { placeholder: 'Поиск на mercasto.com', dir: 'ltr' },
  ar: { placeholder: 'ابحث في mercasto.com', dir: 'rtl' },
};

for (const [lang, copy] of Object.entries(SEARCH_COPY)) {
  test(`Golden catalog search copy is localized in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await installGoldenSearchState(page, lang);

    await page.goto('/listings', { waitUntil: 'domcontentloaded' });
    const input = page.getByTestId('catalog-primary-search');
    await expect(input).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang);
    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(copy.dir);
    await expect(input).toHaveAttribute('placeholder', copy.placeholder);
  });
}

test('desktop Golden catalog search submits the current value with Enter', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installGoldenSearchState(page);
  await page.goto('/listings', { waitUntil: 'domcontentloaded' });

  const input = page.getByTestId('catalog-primary-search');
  await input.fill('iPad Pro');
  await input.press('Enter');

  await expectSearchParam(page, 'iPad Pro');
  await expect(input).toHaveValue('iPad Pro');
});

test('mobile Golden catalog search submits the current value with Enter', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await installGoldenSearchState(page);
  await page.goto('/listings', { waitUntil: 'domcontentloaded' });

  const input = page.getByTestId('catalog-primary-search');
  await expect(input).toBeVisible();
  await input.fill('Toyota Corolla');
  await input.press('Enter');

  await expectSearchParam(page, 'Toyota Corolla');
  await expect(input).toHaveValue('Toyota Corolla');
});
