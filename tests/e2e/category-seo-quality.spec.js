import { expect, test } from '@playwright/test';
import {
  VERTICAL_CANONICAL_ALIASES,
  VERTICAL_SEO_ROUTES,
} from '../../src/constants/verticalSeo.js';

const mockAds = Array.from({ length: 6 }, (_, index) => ({
  id: 97000 + index,
  title: `Anuncio vertical ${index + 1}`,
  price: 1500 + index * 100,
  category: 'electronica',
  state: 'Ciudad de México',
  location: 'Ciudad de México, México',
  image_url: '/placeholder-ad.svg',
  user: { id: 700 + index, role: 'individual' },
}));

async function mockSeoApi(page) {
  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('mercasto_language', 'es');
  });

  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/ads') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockAds,
          total: mockAds.length,
          current_page: 1,
          last_page: 1,
          per_page: mockAds.length,
        }),
      });
    }
    if (url.pathname === '/api/categories') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

function schemaTypes(value) {
  if (Array.isArray(value)) return value.flatMap(schemaTypes);
  if (!value || typeof value !== 'object') return [];
  const own = value['@type'] ? [value['@type']] : [];
  return [...own, ...schemaTypes(value['@graph'])];
}

test('all sitemap verticals have unique Spanish SEO and collection schema', async ({ page }, testInfo) => {
  test.skip(/mobile/i.test(testInfo.project.name), 'Full 14-route SEO matrix runs once on desktop');
  await mockSeoApi(page);

  for (const [route, expected] of Object.entries(VERTICAL_SEO_ROUTES)) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#schema-ld-json')).toHaveCount(1);

    await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
    await expect(page).toHaveTitle(expected.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', expected.description);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/);
    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(new URL(canonicalHref).pathname).toBe(route);
    await expect(page.locator('h1')).toHaveCount(1);

    const structuredData = await page.locator('#schema-ld-json').evaluate(node => JSON.parse(node.textContent || '{}'));
    const types = schemaTypes(structuredData);
    expect(types).toContain('CollectionPage');
    expect(types).toContain('BreadcrumbList');
  }
});

test('non-sitemap vertical aliases are noindex and canonicalize to a primary vertical', async ({ page }, testInfo) => {
  test.skip(/mobile/i.test(testInfo.project.name), 'Alias matrix runs once on desktop');
  await mockSeoApi(page);

  for (const [route, canonicalRoute] of Object.entries(VERTICAL_CANONICAL_ALIASES)) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex,follow/);
    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(new URL(canonicalHref).pathname).toBe(canonicalRoute);
  }
});

test('tourism category tiles stay on noindex filtered results instead of orphan routes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await mockSeoApi(page);
  await page.goto('/turismo', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: /Hoteles y Hospedaje/i }).click();
  await expect(page).toHaveURL(/\/listings\?category=turismo&search=hospedaje/);
});
