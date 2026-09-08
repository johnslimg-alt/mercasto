import { expect, test } from '@playwright/test';

const ads = [
  {
    id: 91001,
    title: { es: 'Toyota Corolla compacto' },
    price: 285000,
    category: 'motor',
    condition: 'usado',
    state: 'Veracruz',
    location: 'Boca del Río, Veracruz',
    image_url: '/placeholder-ad.svg',
    latitude: 19.16,
    longitude: -96.10,
    user: { role: 'individual' },
  },
  {
    id: 91002,
    title: { es: 'Negocio listo para operar' },
    price: 640000,
    category: 'negocios',
    condition: 'nuevo',
    state: 'Veracruz',
    location: 'Veracruz, Veracruz',
    image_url: '/placeholder-ad.svg',
    latitude: 19.18,
    longitude: -96.13,
    user: { role: 'individual' },
  },
];

async function installSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    if (!sessionStorage.getItem('__catalog_view_test_seeded')) {
      localStorage.removeItem('mercasto_catalog_view');
      sessionStorage.setItem('__catalog_view_test_seeded', '1');
    }
  });
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/ads')) {
      const category = url.searchParams.get('category');
      const data = category ? ads.filter(ad => ad.category === category) : ads;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, total: data.length, current_page: 1, last_page: 1 }) });
    }
    if (url.pathname.endsWith('/category-attributes')) {
      const category = url.searchParams.get('category');
      const data = category === 'negocios'
        ? [{ id: 'tipo_negocio', label: 'Tipo de oportunidad', type: 'select', options: ['Traspaso', 'Franquicia'] }]
        : [];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    }
    if (url.pathname.endsWith('/categories')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (url.pathname.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (url.pathname.includes('/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test('catalog list mode is a compact horizontal list and persists across reload', async ({ page }) => {
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/listings?category=motor');
  await page.getByTestId('catalog-list-view').click();

  const card = page.getByTestId('catalog-list-card').first();
  await expect(card).toBeVisible();
  const cardBox = await card.boundingBox();
  const imageBox = await card.locator('img').first().boundingBox();
  expect(cardBox?.height).toBeLessThanOrEqual(125);
  expect(cardBox?.width).toBeGreaterThan(300);
  expect(imageBox?.width).toBeLessThanOrEqual(115);
  expect(imageBox?.height).toBeLessThanOrEqual(105);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mercasto_catalog_view'))).toBe('list');

  await page.reload();
  await expect(page.getByTestId('catalog-list-card').first()).toBeVisible();
});

test('catalog keeps permanent sidebar only on wide desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installSession(page);
  await mockApi(page);
  for (const width of [1024, 1180, 1279]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/listings?category=motor');
    await expect(page.getByTestId('sidebar-filters')).toHaveCount(0);
    const trigger = page.getByTestId('catalog-mobile-filters');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByTestId('catalog-tablet-filter-dialog')).toBeVisible();
    await page.getByTestId('catalog-tablet-filter-close').click();
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/listings?category=motor');
  await expect(page.getByTestId('sidebar-filters')).toBeVisible();
  await expect(page.getByTestId('catalog-mobile-filters')).toBeHidden();
  const sidebarBox = await page.getByTestId('sidebar-filters').boundingBox();
  expect(sidebarBox?.width).toBeLessThanOrEqual(290);
});

test('category quick links stay compact and aligned on mobile', async ({ page }) => {
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/negocios');
  const links = page.getByTestId('category-quick-link');
  await expect(links.first()).toBeVisible();
  const count = await links.count();
  expect(count).toBeGreaterThan(2);
  for (let index = 0; index < Math.min(count, 6); index += 1) {
    const box = await links.nth(index).boundingBox();
    expect(box?.height).toBeLessThanOrEqual(78);
    expect(box?.height).toBeGreaterThanOrEqual(60);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
