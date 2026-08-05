import { expect, test } from '@playwright/test';

async function mockPublicApi(page) {
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
        body: '{"data":[],"total":0,"current_page":1,"last_page":1}',
      });
    }
    if (url.pathname === '/api/categories') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test('public routes declare Mexican Spanish and remain indexable', async ({ page }) => {
  await mockPublicApi(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/);
});

test('filtered catalog URLs are noindex with the generic catalog canonical', async ({ page }) => {
  await mockPublicApi(page);
  await page.goto('/listings?category=motor&state=veracruz', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex,follow/);
  const expectedCanonical = `${new URL(page.url()).origin}/listings`;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', expectedCanonical);
});

test('private application routes are noindex and nofollow', async ({ page }) => {
  await mockPublicApi(page);

  for (const route of ['/post', '/profile', '/admin']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex,nofollow/);
  }
});
