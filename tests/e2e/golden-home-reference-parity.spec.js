import { test, expect } from '@playwright/test';

const ads = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  title: `Producto de referencia ${index + 1}`,
  price: 1200 + index * 350,
  location: index % 2 ? 'Ciudad de México' : 'Veracruz',
  image_url: '/og-default-1200x630.jpg',
  average_rating: 4.8,
  review_count: 12 + index,
}));

async function prepareReferenceHome(page) {
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('cookiesAccepted', 'true');
  });

  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const fulfill = value => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(value),
    });

    if (url.pathname.endsWith('/auth/providers')) return fulfill({ providers: {} });
    if (url.pathname.endsWith('/ads/featured')) return fulfill({ data: ads.slice(0, 5) });
    if (url.pathname.endsWith('/ads')) return fulfill({ data: ads, total: ads.length, current_page: 1, last_page: 1 });
    if (url.pathname.endsWith('/categories')) return fulfill([]);
    if (url.pathname.endsWith('/banners')) return fulfill({ banners: [] });
    if (url.pathname.endsWith('/recommendations/trending')) return fulfill({ data: ads.slice(0, 5) });
    return fulfill({ data: [] });
  });
}

test('desktop Golden home follows approved reference composition', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await prepareReferenceHome(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('golden-header')).toBeVisible();
  await expect(page.getByTestId('golden-desktop-search-input')).toBeVisible();
  await expect(page.getByTestId('golden-header-publish')).toBeVisible();
  await expect(page.getByTestId('golden-reference-hero')).toBeVisible();
  await expect(page.locator('.mcg-ref-hero-art img')).toHaveAttribute('src', '/marketing/golden-home-hero-reference.jpg');

  await expect(page.locator('.mcg-ref-hero-title')).toContainText('Encuentra lo que necesitas.');
  await expect(page.locator('.mcg-ref-hero-title')).toContainText('Vende lo que ya no usas.');
  await expect(page.locator('.mcg-ref-cats > button')).toHaveCount(12);
  await expect(page.locator('.mcg-ref-near-ads .mcg-ad')).toHaveCount(5);
  await expect(page.locator('.mcg-ref-offers .mcg-ad')).toHaveCount(5);
  await expect(page.locator('.mcg-ref-trust > div')).toHaveCount(5);
  await expect(page.locator('.mcg-ref-duo > div')).toHaveCount(2);
  await expect(page.locator('.mcg-ref-cities > button')).toHaveCount(8);
  await expect(page.locator('.mcg-ref-footer')).toBeVisible();

  const hero = await page.getByTestId('golden-reference-hero').boundingBox();
  const heroCopy = await page.locator('.mcg-ref-hero-copy').boundingBox();
  const heroArt = await page.locator('.mcg-ref-hero-art').boundingBox();
  expect(hero.height).toBeGreaterThanOrEqual(500);
  expect(heroArt.width).toBeGreaterThan(heroCopy.width * 0.9);
  expect(heroArt.height).toBeGreaterThanOrEqual(460);

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.screenshot({
    path: 'test-results/reference-home/reference-home-light.png',
    fullPage: true,
  });

  const theme = page.getByTestId('golden-theme-toggle');
  const before = await page.getByTestId('golden-reference-hero').boundingBox();
  await theme.click();
  await expect(theme).toHaveAttribute('aria-pressed', 'true');
  const after = await page.getByTestId('golden-reference-hero').boundingBox();

  expect(Math.abs(before.x - after.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(before.y - after.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(before.width - after.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(before.height - after.height)).toBeLessThanOrEqual(1);

  await page.screenshot({
    path: 'test-results/reference-home/reference-home-dark.png',
    fullPage: true,
  });
});


test('reference category rail keeps kids and business routes semantic', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await prepareReferenceHome(page);
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.mcg-ref-cats').getByRole('button', { name: 'Niños', exact: true }).click();
  await expect(page).toHaveURL(/\/infantil$/);

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('.mcg-ref-cats').getByRole('button', { name: 'Negocios', exact: true }).click();
  await expect(page).toHaveURL(/\/negocios$/);
});
