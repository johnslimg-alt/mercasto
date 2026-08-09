import { test, expect } from '@playwright/test';

const adFixture = (id, title, price) => ({
  id,
  title,
  price,
  category: 'motor',
  subcategory: 'SUV',
  state: 'Jalisco',
  location: 'Guadalajara, Jalisco',
  status: 'active',
  image_url: '/placeholder-ad.svg',
  user: { id: 900 + id, role: 'business', name: 'QA Seller' },
});

async function fulfillJson(route, body) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

test('catalog ignores a stale slower filter response', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('cookiesAccepted', 'true');
  });

  const requestedMinPrices = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.endsWith('/ads') && request.method() === 'GET') {
      const minPrice = url.searchParams.get('min_price') || '';
      requestedMinPrices.push(minPrice);
      if (minPrice === '100') {
        await new Promise(resolve => setTimeout(resolve, 900));
        return fulfillJson(route, { data: [adFixture(101, 'Old 100', 100)], total: 1, current_page: 1, last_page: 1 });
      }
      if (minPrice === '200') {
        await new Promise(resolve => setTimeout(resolve, 50));
        return fulfillJson(route, { data: [adFixture(202, 'New 200', 200)], total: 1, current_page: 1, last_page: 1 });
      }
      return fulfillJson(route, { data: [], total: 0, current_page: 1, last_page: 1 });
    }
    if (path.endsWith('/category-attributes') || path.endsWith('/categories')) return fulfillJson(route, []);
    if (path.endsWith('/auth/providers')) return fulfillJson(route, { google: false, apple: false, sms: false });
    if (path.endsWith('/banners')) return fulfillJson(route, { banners: [] });
    return fulfillJson(route, {});
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  const minPrice = page.getByTestId('sidebar-filter-min-price');
  await expect(minPrice).toBeVisible();

  await minPrice.fill('100');
  await expect.poll(() => requestedMinPrices.includes('100')).toBe(true);
  await minPrice.fill('200');

  await expect(page.getByText('New 200', { exact: true })).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.getByText('New 200', { exact: true })).toBeVisible();
  await expect(page.getByText('Old 100', { exact: true })).toHaveCount(0);
});

test('changing the header subcategory reloads the catalog request', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('cookiesAccepted', 'true');
  });

  const adRequests = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.endsWith('/ads') && request.method() === 'GET') {
      adRequests.push(url.toString());
      return fulfillJson(route, { data: [], total: 0, current_page: 1, last_page: 1 });
    }
    if (path.endsWith('/category-attributes') || path.endsWith('/categories')) return fulfillJson(route, []);
    if (path.endsWith('/auth/providers')) return fulfillJson(route, { google: false, apple: false, sms: false });
    if (path.endsWith('/banners')) return fulfillJson(route, { banners: [] });
    return fulfillJson(route, {});
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/listings?category=motor', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => adRequests.some(requestUrl => new URL(requestUrl).searchParams.get('category') === 'motor')).toBe(true);
  adRequests.length = 0;

  const subcategory = page.locator('nav select').filter({ has: page.locator('option[value="SUV"]') }).first();
  await expect(subcategory).toBeVisible();
  await subcategory.selectOption('SUV');
  await expect.poll(() => new URL(page.url()).searchParams.get('subcategory')).toBe('SUV');
  await expect.poll(() => adRequests.some(requestUrl => new URL(requestUrl).searchParams.get('subcategory') === 'SUV')).toBe(true);
});
