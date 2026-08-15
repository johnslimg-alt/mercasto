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

const routeRecoveryTranslations = {};
for (const lang of ['es', 'en']) {
  routeRecoveryTranslations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

async function installRouteLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
}

async function mockDeepLinkRecoveryApi(page, state) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/api/ads/6336' && request.method() === 'GET') {
      if (!state.recovered) {
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporarily unavailable' }) });
      }
      await new Promise(resolve => setTimeout(resolve, 650));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detailAd) });
    }
    if (path === '/api/ads/404404' && request.method() === 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) });
    }
    if (path === '/api/ads/6336/price-history') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"history":[]}' });
    if (path === '/api/ads/6336/similar') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path.startsWith('/api/recommendations')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' });
    if (path === '/api/ads') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[],"total":0,"current_page":1,"last_page":1}' });
    if (path === '/api/categories' || path === '/api/category-attributes') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path === '/api/auth/providers') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (path.includes('/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of ['es', 'en']) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`deep-link ad keeps 503 distinct from 404 and recovers in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installRouteLanguage(page, lang);
      const state = { recovered: false };
      await mockDeepLinkRecoveryApi(page, state);
      await page.goto('/ads/6336', { waitUntil: 'domcontentloaded' });
      const t = routeRecoveryTranslations[lang];

      await expect(page.getByTestId('deep-link-ad-load-error')).toContainText(t.route_load_error);
      await expect(page.getByTestId('not-found-screen')).toHaveCount(0);
      await expect(page.getByTestId('deep-link-ad-retry')).toHaveText(t.retry_btn);

      state.recovered = true;
      await page.getByTestId('deep-link-ad-retry').click();
      await expect(page.getByTestId('deep-link-ad-loading')).toBeVisible();
      await expect(page.getByTestId('deep-link-ad-load-error')).toHaveCount(0);
      await expect(page.locator('[data-ad-detail-hero="true"]')).toBeVisible();
    });
  }
}

test('deep-link ad renders NotFound only for a real 404', async ({ page }) => {
  await installRouteLanguage(page, 'es');
  await mockDeepLinkRecoveryApi(page, { recovered: false });
  await page.goto('/ads/404404', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('not-found-screen')).toBeVisible();
  await expect(page.getByTestId('deep-link-ad-load-error')).toHaveCount(0);
});


test('ad detail QR dialog traps focus and restores the share control on desktop and mobile layouts', async ({ page }) => {
  const requests = [];
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('cookie_consent', 'essential');
  });
  await mockDetailApi(page, requests);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/ads/6336', { waitUntil: 'domcontentloaded' });
    const shareOpener = page.getByRole('button', { name: /Share/i }).first();
    await shareOpener.focus();
    await shareOpener.click();
    const qrAction = page.getByRole('button', { name: /QR/i }).first();
    await qrAction.click();

    const qrDialog = page.locator('[role="dialog"][aria-labelledby="ad-qr-title"]');
    const closeButton = qrDialog.getByRole('button', { name: /Close/i });
    await expect(qrDialog).toBeVisible();
    await expect(closeButton).toBeFocused();
    await closeButton.press('Shift+Tab');
    await expect.poll(() => qrDialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(qrDialog).toHaveCount(0);
    await expect(shareOpener).toBeFocused();
  }
});
