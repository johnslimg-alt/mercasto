import { expect, test } from '@playwright/test';

const catalogAds = Array.from({ length: 24 }, (_, index) => ({
  id: 88000 + index,
  title: `Anuncio de prueba ${index + 1}`,
  price: 1000 + (index * 50),
  category: 'productos',
  location: 'Ciudad de México, México',
  state: 'Ciudad de México',
  image_url: '/placeholder-ad.svg',
  user: { id: 500 + index, role: 'individual' },
}));

async function mockPublicApi(page) {
  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/ads' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: catalogAds,
          total: catalogAds.length,
          current_page: 1,
          last_page: 1,
          per_page: catalogAds.length,
        }),
      });
    }

    if (url.pathname === '/api/categories') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test('catalog route loads its own chunk without the marketing homepage', async ({ page }) => {
  await mockPublicApi(page);
  const requestedScripts = [];
  const requestedApiUrls = [];
  page.on('request', request => {
    if (request.resourceType() === 'script') requestedScripts.push(request.url());
    if (request.url().includes('/api/')) requestedApiUrls.push(request.url());
  });

  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-catalog-screen]')).toBeVisible();
  await expect(page.locator('[data-catalog-card]').first()).toBeVisible();

  expect(requestedScripts.some(url => /CatalogScreen-/.test(url))).toBeTruthy();
  expect(requestedScripts.some(url => /HomeScreen-/.test(url))).toBeFalsy();
  expect(requestedApiUrls.filter(url => /[?&]category=(inmobiliaria|empleo|servicios|motor)/.test(url))).toEqual([]);
  const initialCatalogRequests = requestedApiUrls.filter(rawUrl => {
    const url = new URL(rawUrl);
    return url.pathname === '/api/ads' && url.searchParams.get('page') === '1';
  });
  expect(initialCatalogRequests).toHaveLength(1);
});


test('listings query parameters hydrate the catalog request', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await mockPublicApi(page);
  const adRequests = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/ads') adRequests.push(url);
  });

  await page.goto('/listings?q=Toyota', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-catalog-screen]')).toBeVisible();
  await expect.poll(() => adRequests.some(url => url.searchParams.get('search') === 'Toyota')).toBeTruthy();
});

test('mobile catalog reveals cards in small batches', async ({ page }, testInfo) => {
  test.skip(!/mobile/i.test(testInfo.project.name), 'Batching is scoped to mobile catalog startup');
  await page.addInitScript(() => {
    window.__mercastoCatalogCls = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__mercastoCatalogCls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await mockPublicApi(page);

  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-catalog-card]')).toHaveCount(8);
  const catalogImages = page.locator('[data-catalog-card] img');
  await expect(catalogImages.nth(0)).toHaveAttribute('loading', 'eager');
  await expect(catalogImages.nth(0)).toHaveAttribute('fetchpriority', 'high');
  await expect(catalogImages.nth(1)).toHaveAttribute('loading', 'eager');
  await expect(catalogImages.nth(1)).toHaveAttribute('fetchpriority', 'high');
  await expect(catalogImages.nth(2)).toHaveAttribute('loading', 'lazy');
  await expect(catalogImages.nth(2)).toHaveAttribute('fetchpriority', 'auto');
  await page.waitForTimeout(400);
  const countBeforeScroll = await page.locator('[data-catalog-card]').count();
  expect(countBeforeScroll).toBeGreaterThanOrEqual(8);
  expect(countBeforeScroll).toBeLessThan(catalogAds.length);
  expect(countBeforeScroll % 8).toBe(0);
  const cls = await page.evaluate(() => window.__mercastoCatalogCls || 0);
  expect(cls).toBeLessThan(0.1);

  await page.locator('[data-catalog-batch-sentinel]').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('[data-catalog-card]').count()).toBeGreaterThan(countBeforeScroll);
});

test('desktop catalog renders the complete current page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await mockPublicApi(page);

  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-catalog-card]')).toHaveCount(catalogAds.length);
});
