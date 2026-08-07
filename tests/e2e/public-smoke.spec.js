import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/listings',
  '/publish',
  '/login',
  '/register',
  '/account',
  '/account/listings',
  '/account/billing',
  '/account/promotions',
];

const legalRoutes = [
  { path: '/terminos', marker: /Términos|Terminos|Uso/i },
  { path: '/privacidad', marker: /Privacidad|datos personales/i },
  { path: '/cookies', marker: /Cookies/i },
  { path: '/contacto', marker: /Contacto|soporte@mercasto\.com/i },
  { path: '/ayuda', marker: /Ayuda|Centro/i },
  { path: '/safety', marker: /Seguridad|Safety|fraude/i },
  { path: '/reembolsos', marker: /Política de pagos y reembolsos/i },
  { path: '/moderacion', marker: /Política de moderación/i },
];

function extractAds(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.ads)) return payload.ads;
  return [];
}

function extractAd(payload) {
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  return payload;
}

function translatedTitle(value) {
  if (!value || typeof value !== 'object') return '';
  const translated = value.es || value.en || Object.values(value).find(item => typeof item === 'string');
  return String(translated || '').trim();
}

function publicListingTitle(ad) {
  if (ad?.title && typeof ad.title === 'object') return translatedTitle(ad.title);
  if (typeof ad?.title !== 'string') return '';

  const title = ad.title.trim();
  if (!title.startsWith('{')) return title;
  try {
    return translatedTitle(JSON.parse(title)) || title;
  } catch {
    return title;
  }
}

async function firstPublicAd(request) {
  const response = await request.get('/api/ads?page=1');
  expect(response.ok(), 'public ads API should return a usable listing').toBe(true);
  const ads = extractAds(await response.json());
  expect(ads.length, 'public ads API should expose at least one listing').toBeGreaterThan(0);
  expect(ads[0]?.id, 'first public listing should have an id').toBeTruthy();
  return ads[0];
}

async function expectHealthyPublicResponse(request, path) {
  const response = await request.get(path);
  const status = response.status();

  expect(
    status >= 200 && status < 300 || status === 429,
    `${path} should be OK or rate-limited, got ${status}`,
  ).toBe(true);
}

test.describe('browser route aliases', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    });
  });

  for (const mode of ['login', 'register']) {
    test(`/${mode} opens the matching authentication entry instead of a 404`, async ({ page }) => {
      await page.goto(`/${mode}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).not.toContainText(/Error 404|No encontrado/i);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();

      if (mode === 'register') {
        await expect(page.locator('input[name="name"]')).toBeVisible();
        await expect(page.locator('input[name="age_confirmed"]')).toBeVisible();
      } else {
        await expect(page.locator('input[name="name"]')).toHaveCount(0);
      }
    });
  }

  const protectedAliases = [
    { path: '/publish', target: /\/post$/, heading: /Inicia sesión para continuar/i },
    { path: '/account', target: /\/profile$/, heading: /Inicia sesión para continuar/i },
    { path: '/account/listings', target: /\/profile\?tab=my_ads$/, heading: /Inicia sesión para continuar/i },
    { path: '/account/billing', target: /\/profile\?tab=transactions$/, heading: /Inicia sesión para continuar/i },
    { path: '/admin/login', target: /\/admin$/, heading: /Inicia sesión para continuar/i },
    { path: '/account/listing/1/edit', target: /\/anuncio\/1\/editar$/, heading: /Inicia sesión para continuar/i },
    { path: '/account/listing/1/photos', target: /\/anuncio\/1\/editar\?section=photos$/, heading: /Inicia sesión para continuar/i },
  ];

  for (const route of protectedAliases) {
    test(`${route.path} resolves to its protected browser destination`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(route.target);
      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/Error 404|No encontrado/i);
    });
  }

  test('/account/promotions resolves to the public pricing page', async ({ page }) => {
    await page.goto('/account/promotions', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/tarifas$/);
    await expect(page.getByRole('heading', { name: /Publicar es gratuito durante siete días/i })).toBeVisible();
  });
});

test.describe('public launch smoke', () => {
  for (const route of publicRoutes) {
    test(`${route} renders without server error`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route} HTTP status`).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/Whoops|Stack trace|SQLSTATE|APP_KEY|DB_PASSWORD|Exception/i);
    });
  }

  for (const route of legalRoutes) {
    test(`${route.path} renders expected legal/business content`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route.path} HTTP status`).toBeLessThan(400);
      await expect(page.locator('body')).toContainText(route.marker, { timeout: 20_000 });
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/Whoops|Stack trace|SQLSTATE|APP_KEY|DB_PASSWORD|Exception|No pudimos cargar esta página/i);
    });
  }

  test('canonical listing detail renders the API listing', async ({ page, request }) => {
    const ad = await firstPublicAd(request);
    const response = await page.goto(`/ads/${ad.id}`, { waitUntil: 'domcontentloaded' });

    expect(response?.status(), 'canonical listing detail HTTP status').toBeLessThan(400);
    await expect(page).toHaveURL(new RegExp(`/ads/${ad.id}/?$`));
    const title = publicListingTitle(ad);
    expect(title, 'public listing should expose a display title').not.toBe('');
    await expect(page.locator('body')).toContainText(title);
    await expect(page.locator('body')).not.toContainText(/Error 404|Not found|No results found/i);
  });

  test('listing card detail survives direct refresh without overflow', async ({ page, request }) => {
    await page.route('**/api/ads/*/view', route => {
      if (route.request().method() !== 'POST') return route.continue();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: false }),
      });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const firstCard = page.locator('.market-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page).toHaveURL(/#ad-\d+$/);

    const detailUrl = page.url();
    const adId = new URL(detailUrl).hash.match(/^#ad-(\d+)$/)?.[1];
    expect(adId, 'listing card URL should expose its listing id').toBeTruthy();
    const apiResponse = await request.get(`/api/ads/${adId}`);
    expect(apiResponse.ok(), 'selected listing API should remain available').toBe(true);
    const title = publicListingTitle(extractAd(await apiResponse.json()));
    expect(title, 'selected listing should expose a display title').not.toBe('');
    await expect(page.locator('body')).toContainText(title);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(detailUrl);
    await expect(page.locator('body')).toContainText(title);
    await expect(page.locator('body')).not.toContainText(/Error 404|Not found|No results found/i);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'listing detail should not overflow horizontally').toBeLessThanOrEqual(1);
  });

  test('health and core APIs respond', async ({ request }) => {
    await expectHealthyPublicResponse(request, '/up');
    await expectHealthyPublicResponse(request, '/api/categories');
    await expectHealthyPublicResponse(request, '/api/ads?page=1');
  });

  test('sensitive files are denied', async ({ request }) => {
    const paths = ['/.env', '/.git/config', '/backend/.env', '/composer.json', '/package.json', '/wp-login.php', '/wp-admin/', '/wp-includes/js/jquery/', '/scanner-probe.php'];
    for (const path of paths) {
      const response = await request.get(path);
      expect(response.status(), `${path} should be hidden`).toBe(404);
    }
  });

  test('SEO manifests are reachable', async ({ request }) => {
    await expect(await request.get('/robots.txt')).toBeOK();
    await expect(await request.get('/sitemap.xml')).toBeOK();
  });
});
