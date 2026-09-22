import { expect, test } from '@playwright/test';

const catalogAds = Array.from({ length: 24 }, (_, index) => ({
  id: 88000 + index,
  title: `Anuncio de prueba ${index + 1}`,
  price: 1000 + (index * 50),
  category: 'productos',
  location: 'Ciudad de México, México',
  state: 'Ciudad de México',
  image_url: index === 0
    ? '/placeholder-ad.svg'
    : index === 1
      ? '/ads/legacy.jpg'
      : index === 2
        ? 'ads/relative.jpg'
        : index === 3
          ? '/storage/already.jpg'
          : '/placeholder-ad.svg',
  user: { id: 500 + index, role: 'individual' },
}));

async function mockPublicApi(page) {
  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
  });

  await page.route('**/storage/**', route => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>',
  }));

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
  const requestedImageUrls = [];
  page.on('request', request => {
    if (request.resourceType() === 'script') requestedScripts.push(request.url());
    if (request.resourceType() === 'image') requestedImageUrls.push(request.url());
    if (request.url().includes('/api/')) requestedApiUrls.push(request.url());
  });

  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-catalog-screen]')).toBeVisible();
  await expect(page.locator('[data-catalog-card]').first()).toBeVisible();

  expect(requestedScripts.some(url => /CatalogScreen-/.test(url))).toBeTruthy();
  expect(requestedScripts.some(url => /HomeScreen-/.test(url))).toBeFalsy();
  const requestedImagePaths = () => requestedImageUrls.map(rawUrl => new URL(rawUrl).pathname);
  await expect.poll(() => requestedImagePaths()).toEqual(expect.arrayContaining([
    '/placeholder-ad.svg',
    '/storage/ads/legacy.jpg',
    '/storage/ads/relative.jpg',
    '/storage/already.jpg',
  ]));
  expect(requestedImagePaths()).not.toContain('/storage//placeholder-ad.svg');
  expect(requestedImagePaths()).not.toContain('/ads/legacy.jpg');
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
    window.__mercastoCatalogClsEntries = [];
    const describeNode = (node) => {
      if (!node) return null;
      const testId = node.getAttribute?.('data-testid');
      const catalogMarker = node.hasAttribute?.('data-catalog-card') ? '[data-catalog-card]' : '';
      const id = node.id ? `#${node.id}` : '';
      const classes = typeof node.className === 'string'
        ? node.className.split(/\s+/).filter(Boolean).slice(0, 4).map(value => `.${value}`).join('')
        : '';
      return `${node.tagName?.toLowerCase?.() || 'node'}${id}${testId ? `[data-testid="${testId}"]` : ''}${catalogMarker}${classes}`;
    };
    const rect = value => value ? {
      x: Math.round(value.x * 10) / 10,
      y: Math.round(value.y * 10) / 10,
      width: Math.round(value.width * 10) / 10,
      height: Math.round(value.height * 10) / 10,
    } : null;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__mercastoCatalogCls += entry.value;
        window.__mercastoCatalogClsEntries.push({
          value: entry.value,
          sources: (entry.sources || []).map(source => ({
            node: describeNode(source.node),
            previousRect: rect(source.previousRect),
            currentRect: rect(source.currentRect),
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await mockPublicApi(page);

  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  const catalogCards = page.locator('[data-catalog-card]');
  await expect.poll(() => catalogCards.count()).toBeGreaterThanOrEqual(8);
  const initialBatchCount = await catalogCards.count();
  expect(initialBatchCount).toBeLessThan(catalogAds.length);
  expect(initialBatchCount % 8).toBe(0);
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
  const clsSample = await page.evaluate(() => ({
    cls: window.__mercastoCatalogCls || 0,
    entries: window.__mercastoCatalogClsEntries || [],
  }));
  expect(
    clsSample.cls,
    `CLS entries: ${JSON.stringify(clsSample.entries)}`,
  ).toBeLessThan(0.1);

  await page.locator('[data-catalog-batch-sentinel]').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('[data-catalog-card]').count()).toBeGreaterThan(countBeforeScroll);
});

test('desktop catalog renders the complete current page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await mockPublicApi(page);

  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-catalog-card]')).toHaveCount(catalogAds.length);
});
