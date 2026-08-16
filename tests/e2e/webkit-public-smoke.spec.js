import { expect, test } from '@playwright/test';

const categories = [
  { id: 1, slug: 'productos', name: { es: 'Productos', en: 'Products' } },
  { id: 9, slug: 'coches', name: { es: 'Coches', en: 'Cars' } },
];

const listing = {
  id: 701,
  title: 'Toyota Corolla WebKit QA',
  description: 'Anuncio público para verificar compatibilidad WebKit.',
  price: 250000,
  category: 'coches',
  state: 'Veracruz',
  city: 'Boca del Río',
  location: 'Boca del Río, Veracruz',
  image_url: '/placeholder-ad.svg',
  status: 'active',
  user: { id: 17, name: 'QA Seller', role: 'individual' },
};

async function installGuestSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  });
}

async function mockPublicApi(page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    const json = (body, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

    if (path.endsWith('/auth/providers')) {
      return json({ google: false, apple: false, sms: false, twitter: false, telegram: false });
    }
    if (path.endsWith('/categories')) return json(categories);
    if (path.endsWith('/category-attributes')) return json([]);
    if (path === '/api/ads' || path.endsWith('/ads')) {
      return json({ data: [listing], total: 1, current_page: 1, last_page: 1 });
    }
    if (path.endsWith(`/ads/${listing.id}/view`) && request.method() === 'POST') {
      return json({ success: true });
    }
    if (path.endsWith(`/ads/${listing.id}`)) return json(listing);
    if (path.endsWith('/favorites')) return json([]);
    if (path.includes('/recommendations') || path.includes('/featured') || path.includes('/trending')) {
      return json({ data: [] });
    }
    return json({});
  });
}

async function expectHealthyShell(page) {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(
    /Mercasto no pudo cargar|Whoops|Stack trace|SQLSTATE|APP_KEY|DB_PASSWORD|Exception/i,
  );
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'page should not overflow horizontally').toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await installGuestSession(page);
  await mockPublicApi(page);
});

for (const route of ['/', '/listings', '/login', '/register']) {
  test(`${route} renders a healthy public shell in WebKit`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `${route} should be served by the frontend preview`).toBeLessThan(400);
    await expectHealthyShell(page);
    expect(errors, `page errors on ${route}: ${errors.join(' | ')}`).toEqual([]);
  });
}

test('guest publish alias keeps intended auth entry in WebKit', async ({ page }) => {
  await page.goto('/publish', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/post$/);
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expectHealthyShell(page);
});

test('listing card opens and survives direct refresh in WebKit', async ({ page }) => {
  await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  const card = page.locator('.ad-result-card').filter({ hasText: listing.title }).first();
  await expect(card).toBeVisible();
  await card.locator('button[aria-label="Toyota Corolla WebKit QA"]').click();
  await expect(page).toHaveURL(new RegExp(`#ad-${listing.id}$`));
  await expect(page.locator('body')).toContainText(listing.title);

  const detailUrl = page.url();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(detailUrl);
  await expect(page.locator('body')).toContainText(listing.title);
  await expectHealthyShell(page);
});
