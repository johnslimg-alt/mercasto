import { test, expect } from '@playwright/test';

async function prepare(page, theme = 'light', lang = 'es') {
  await page.addInitScript(({ theme, lang }) => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('lang', lang);
    localStorage.setItem('mercasto_language', lang);
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('cookiesAccepted', 'true');
  }, { theme, lang });
  await page.route('**/api/**', async route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [] }),
  }));
}

for (const width of [390, 768, 1440]) {
  test(`Golden blog index and article remain stable at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await prepare(page);
    await page.setViewportSize({ width, height: 900 });

    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('golden-header')).toBeVisible();
    await expect(page.getByTestId('golden-blog-main')).toBeVisible();
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.getByTestId('blog-card')).toHaveCount(3);

    const overflowIndex = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowIndex).toBeLessThanOrEqual(1);

    await page.getByTestId('blog-card').first().getByRole('link').click();
    await expect(page).toHaveURL(/\/blog\/como-vender-mas-rapido$/);
    await expect(page.getByTestId('golden-blog-article-main')).toBeVisible();
    await expect(page.getByTestId('blog-article-section')).toHaveCount(3);

    const overflowArticle = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowArticle).toBeLessThanOrEqual(1);
  });
}

test('Golden blog supports day/night geometry and canonical article metadata', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await prepare(page);
  await page.setViewportSize({ width: 1024, height: 844 });
  await page.goto('/blog/comprar-con-seguridad', { waitUntil: 'domcontentloaded' });

  const before = await page.getByTestId('golden-blog-article-main').boundingBox();
  const theme = page.getByTestId('golden-theme-toggle');
  await theme.click();
  await expect(theme).toHaveAttribute('aria-pressed', 'true');
  const after = await page.getByTestId('golden-blog-article-main').boundingBox();

  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://mercasto.com/blog/comprar-con-seguridad',
  );
  await expect(page.locator('script#mercasto-blog-article-schema')).toHaveCount(1);
});

test('unknown blog article uses an honest Golden not-found state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await prepare(page);
  await page.goto('/blog/no-existe', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('golden-header')).toBeVisible();
  await expect(page.getByTestId('golden-blog-article-main')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Artículo no encontrado' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});


test('non-Spanish blog readers receive the English editorial fallback', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await prepare(page, 'light', 'en');
  await page.goto('/blog/comprar-con-seguridad', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Guide to buying safely' })).toBeVisible();
  await expect(page.getByText('Verify the listing information')).toBeVisible();
  await expect(page.getByText('Guía para comprar con seguridad')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://mercasto.com/blog/comprar-con-seguridad',
  );
});
