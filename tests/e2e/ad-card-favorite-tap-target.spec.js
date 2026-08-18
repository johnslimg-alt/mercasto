import { test, expect } from '@playwright/test';

const ad = {
  id: 68501,
  title: 'Favorite target QA',
  description: 'Deterministic mobile card used only by the browser regression.',
  price: 1250,
  state: 'Jalisco',
  location: 'Guadalajara, Jalisco',
  category: 'otros',
  image_url: '/placeholder-ad.svg',
  status: 'active',
  user: { id: 685, name: 'QA Seller', role: 'individual' },
};

async function prepareCatalog(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  });
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/ads') && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [ad], total: 1, current_page: 1, last_page: 1 }),
      });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes') || path.endsWith('/favorites')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ google: false, apple: false, sms: false }),
      });
    }
    if (path.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/listings');
}

test('mobile favorite target is 48px and does not activate the card', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await prepareCatalog(page);

  const favorite = page.getByTestId('ad-card-favorite').first();
  await expect(favorite).toBeVisible();
  const favoriteBox = await favorite.boundingBox();
  expect(favoriteBox?.width).toBeGreaterThanOrEqual(48);
  expect(favoriteBox?.height).toBeGreaterThanOrEqual(48);

  const card = favorite.locator('xpath=ancestor::article');
  const contact = card.getByRole('button', { name: /contact/i });
  await expect(contact).toBeVisible();
  const contactBox = await contact.boundingBox();
  expect(contactBox?.height).toBeGreaterThanOrEqual(48);

  await favorite.click();
  await expect.poll(() => new URL(page.url()).hash).toBe('');
});

test('mobile card activation remains reachable outside the favorite target', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await prepareCatalog(page);

  const card = page.getByTestId('ad-card-favorite').first().locator('xpath=ancestor::article');
  await card.getByRole('button', { name: 'Favorite target QA', exact: true }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe(`#ad-${ad.id}`);
});
