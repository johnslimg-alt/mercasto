import { expect, test } from '@playwright/test';

const detailAd = {
  id: 6336,
  user_id: 77,
  title: 'Fundas para Asientos de Piel Sintética - Modelo B',
  description: 'Descripción de prueba para la ficha del anuncio.',
  price: 1499,
  category: 'motor',
  condition: 'nuevo',
  state: 'Ciudad de México',
  location: 'Ciudad de México, México',
  image_url: '/placeholder-ad.svg',
  created_at: '2026-07-01T12:00:00Z',
  user: {
    id: 77,
    name: 'Vendedor de prueba',
    role: 'individual',
    created_at: '2025-01-01T12:00:00Z',
  },
};

async function mockDetailApi(page, requests) {
  await page.addInitScript(() => localStorage.setItem('cookiesAccepted', 'true'));
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(url.pathname + url.search);

    if (url.pathname === '/api/ads/6336' && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detailAd) });
    }
    if (url.pathname === '/api/ads/6336/price-history') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"history":[]}' });
    }
    if (url.pathname === '/api/ads/6336/similar') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.startsWith('/api/recommendations')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' });
    }
    if (url.pathname === '/api/ads') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[],"total":0,"current_page":1,"last_page":1}' });
    }
    if (url.pathname === '/api/categories') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test('ad detail prioritizes the hero and defers below-fold bundles', async ({ page }) => {
  const apiRequests = [];
  const scripts = [];
  page.on('request', request => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });
  await mockDetailApi(page, apiRequests);

  await page.goto('/ads/6336', { waitUntil: 'domcontentloaded' });
  const hero = page.locator('[data-ad-detail-hero="true"]');
  await expect(hero).toBeVisible();
  await expect(hero).toHaveAttribute('loading', 'eager');
  await expect(hero).toHaveAttribute('fetchpriority', 'high');
  await expect(hero).toHaveAttribute('width', '800');
  await expect(hero).toHaveAttribute('height', '600');

  await page.waitForTimeout(400);
  expect(apiRequests.some(url => url.includes('/similar'))).toBeFalsy();
  expect(apiRequests.some(url => url.startsWith('/api/recommendations'))).toBeFalsy();
  expect(scripts.some(url => /MapV3-|leaflet-src-/.test(url))).toBeFalsy();
  expect(scripts.some(url => /RecommendationsWidget-/.test(url))).toBeFalsy();
  expect(scripts.some(url => /qrcode/i.test(url))).toBeFalsy();

  await page.locator('[data-ad-detail-map-shell]').scrollIntoViewIfNeeded();
  await expect.poll(() => scripts.some(url => /MapV3-/.test(url))).toBeTruthy();

  await page.locator('[data-ad-detail-related-shell]').scrollIntoViewIfNeeded();
  await expect.poll(() => apiRequests.some(url => url.includes('/similar'))).toBeTruthy();
  await expect.poll(() => apiRequests.some(url => url.startsWith('/api/recommendations'))).toBeTruthy();
  await expect.poll(() => scripts.some(url => /RecommendationsWidget-/.test(url))).toBeTruthy();
});
