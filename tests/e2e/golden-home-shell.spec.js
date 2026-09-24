import { test, expect } from '@playwright/test';

async function prepareHome(page) {
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('cookiesAccepted', 'true');
  });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const json = value => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(value),
    });
    if (url.pathname.endsWith('/auth/providers')) return json({ providers: {} });
    if (url.pathname.endsWith('/ads/featured')) return json({ data: [] });
    if (url.pathname.endsWith('/ads')) {
      return json({ data: [], total: 0, current_page: 1, last_page: 1 });
    }
    if (url.pathname.endsWith('/categories')) return json([]);
    if (url.pathname.endsWith('/banners')) return json({ banners: [] });
    if (url.pathname.endsWith('/recommendations/trending')) return json({ data: [] });
    return json({ data: [] });
  });
}

test('approved desktop home owns its shell and controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await prepareHome(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const header = page.getByTestId('golden-header');
  await expect(header).toBeVisible();
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(header.locator('input')).toHaveCount(1);
  await expect(page.getByTestId('golden-desktop-search-input')).toBeVisible();
  await expect(page.getByTestId('golden-header-publish')).toBeVisible();
  await expect(page.getByTestId('golden-reference-hero')).toBeVisible();

  const [brand, location] = await Promise.all([
    header.locator('.mcg-brand').boundingBox(),
    page.getByTestId('golden-location-button').boundingBox(),
  ]);
  expect(location.x).toBeGreaterThanOrEqual(brand.x + brand.width - 1);

  const theme = page.getByTestId('golden-theme-toggle');
  await expect(theme).toHaveAttribute('aria-pressed', 'false');
  await theme.click();
  await expect(theme).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => ({
    stored: localStorage.getItem('theme'),
    dark: document.documentElement.classList.contains('dark'),
  }))).toEqual({ stored: 'dark', dark: true });

  const language = page.getByTestId('golden-language-select');
  await language.selectOption('ru');
  await expect(language).toHaveValue('ru');

  await page.getByTestId('golden-location-button').click();
  await page.getByTestId('golden-location-state').selectOption('Veracruz');
  await page.getByTestId('golden-location-city').selectOption('Boca del Río');
  await page.getByTestId('golden-location-apply').click();
  await expect(page).toHaveURL(/\/listings/);
});

test('approved mobile home keeps one shell without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await prepareHome(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('golden-header')).toBeVisible();
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.getByTestId('golden-language-select')).toBeVisible();
  await expect(page.getByTestId('golden-theme-toggle')).toBeVisible();
  await expect(page.getByTestId('golden-mobile-search-input')).toBeVisible();
  await expect(page.locator('.mcg-bottom-nav')).toBeVisible();

  const visibleH1 = page.locator('h1:visible');
  await expect(visibleH1).toHaveCount(1);

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const visibleFooters = page.locator('footer:visible');
  await expect(visibleFooters).toHaveCount(1);

  await page.getByTestId('golden-mobile-search-input').fill('iPhone');
  await page.getByTestId('golden-mobile-search-input').press('Enter');
  await expect(page).toHaveURL(/\/listings/);
});
