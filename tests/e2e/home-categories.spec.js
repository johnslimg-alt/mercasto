import { test, expect } from '@playwright/test';

for (const language of ['es', 'en', 'ar']) {
  test(`first category stays visible in ${language}`, async ({ page }) => {
    await page.addInitScript((lang) => {
      localStorage.setItem('lang', lang);
      localStorage.setItem('mercasto_language', lang);
    }, language);
    await page.goto('/');

    const rail = page.getByTestId('home-category-rail');
    const autos = page.getByTestId('home-category-motor');
    await expect(rail).toBeVisible();
    await expect(autos).toBeVisible();

    const position = await page.evaluate(() => {
      const railElement = document.querySelector('[data-testid="home-category-rail"]');
      const autosElement = document.querySelector('[data-testid="home-category-motor"]');
      const railRect = railElement.getBoundingClientRect();
      const autosRect = autosElement.getBoundingClientRect();
      return {
        railLeft: railRect.left,
        railRight: railRect.right,
        autosLeft: autosRect.left,
        autosRight: autosRect.right,
        pageWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(position.autosLeft).toBeGreaterThanOrEqual(position.railLeft - 1);
    expect(position.autosRight).toBeLessThanOrEqual(position.railRight + 1);
    expect(position.scrollWidth).toBeLessThanOrEqual(position.pageWidth + 2);
  });
}


async function mockHomeApi(page, { ads = [], recommendations = [] } = {}) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: { google: false, apple: false, telegram: false, sms: false } }) });
    }
    if (url.pathname.endsWith('/recommendations/trending')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: recommendations }) });
    }
    if (url.pathname.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: ads, total: ads.length, current_page: 1, last_page: 1 }) });
    }
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes') || url.pathname.endsWith('/favorites')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

test('home utility actions produce localized feedback and rent opens canonical results', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('cookie_consent', 'essential');
  });
  await mockHomeApi(page);
  await page.goto('/');

  await page.getByTestId('home-upload-cv').click();
  await expect(page.getByRole('status')).toHaveText('CV upload will be available from your user dashboard.');

  await page.getByTestId('home-create-job-alert').click();
  await expect(page.getByRole('status')).toHaveText('Job alert saved for this search.');

  const newsletter = page.getByTestId('home-newsletter-submit').locator('xpath=..');
  await newsletter.locator('input[type="email"]').fill('qa@example.test');
  await page.getByTestId('home-newsletter-submit').click();
  await expect(page.getByRole('status')).toHaveText('Thanks for subscribing.');

  await page.getByTestId('home-real-estate-rent').click();
  await expect(page).toHaveURL(/category=inmobiliaria/);
  await expect(page).toHaveURL(/search=renta/);

  await page.goto('/');
  await page.getByTestId('home-open-filters').click();
  await expect(page).toHaveURL(/\/listings$/);
  await expect(page.locator('[data-catalog-screen]')).toBeVisible();
});

test('home listing card opens the exact ad detail', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const ad = {
    id: 501,
    title: 'QA Home Card',
    description: 'QA card detail',
    price: 1250,
    category: 'electronica',
    condition: 'usado',
    status: 'active',
    is_catalog_filler: true,
    image_url: null,
    user: null,
  };
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookie_consent', 'essential');
  });
  await mockHomeApi(page, { ads: [ad] });
  await page.goto('/');
  await page.getByRole('button', { name: ad.title, exact: true }).first().click();
  await expect(page).toHaveURL(/#ad-501$/);
  await expect(page.getByRole('heading', { level: 1, name: ad.title, exact: true })).toBeVisible();
});

test('recommendation carousel exposes honest previous and next states', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const recommendations = Array.from({ length: 6 }, (_, index) => ({
    id: 600 + index,
    title: `QA Recommendation ${index + 1}`,
    price: 1000 + index,
    currency: 'MXN',
    images: [],
  }));
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookie_consent', 'essential');
  });
  await mockHomeApi(page, { recommendations });
  await page.goto('/');

  const scroller = page.getByTestId('recommendations-scroller');
  const previous = page.getByTestId('recommendations-prev');
  const next = page.getByTestId('recommendations-next');
  await expect(scroller).toBeVisible();
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();

  await next.click();
  await expect.poll(() => scroller.evaluate(node => node.scrollLeft)).toBeGreaterThan(20);
  await expect(previous).toBeEnabled();

  await scroller.evaluate(node => {
    node.scrollLeft = node.scrollWidth;
    node.dispatchEvent(new Event('scroll'));
  });
  await expect(next).toBeDisabled();
  const atEnd = await scroller.evaluate(node => node.scrollLeft);
  await previous.click();
  await expect.poll(() => scroller.evaluate(node => node.scrollLeft)).toBeLessThan(atEnd - 20);
});
