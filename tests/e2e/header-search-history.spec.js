import { test, expect } from '@playwright/test';

async function installGuest(page) {
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
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/ads') && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }),
      });
    }
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (url.pathname.endsWith('/search/suggestions')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test('header search preserves catalog route and restores query through back/forward', async ({ page }, testInfo) => {
  await installGuest(page);
  await mockPublicApi(page);

  await page.goto('/listings?search=corolla');
  const search = page.getByTestId(testInfo.project.name.includes('mobile') ? 'mobile-search-input' : 'desktop-search-input');
  await expect(search).toHaveValue('corolla');
  await expect(page).toHaveURL(/\/listings\?search=corolla/);

  await search.fill('camry');
  await expect(page).toHaveURL(/\/listings\?search=corolla/);
  await expect(search).toHaveValue('camry');

  await search.press('Enter');
  await expect(page).toHaveURL(/\/listings\?search=camry/);
  await expect(search).toHaveValue('camry');

  await page.goBack();
  await expect(page).toHaveURL(/\/listings\?search=corolla/);
  await expect(search).toHaveValue('corolla');

  await page.goForward();
  await expect(page).toHaveURL(/\/listings\?search=camry/);
  await expect(search).toHaveValue('camry');
});
