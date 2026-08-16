import { test, expect } from '@playwright/test';

test('desktop header search and location work', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/');

  await page.getByTestId('desktop-search-input').fill('Toyota');
  await page.getByTestId('desktop-search-submit').click();
  await expect(page).toHaveURL(/search=Toyota/);

  await page.getByTestId('desktop-location-button').click();
  await page.getByTestId('desktop-location-state').selectOption('Jalisco');
  await expect(page.getByTestId('desktop-location-city')).toBeEnabled();
  await page.getByTestId('desktop-location-city').selectOption('Guadalajara');
  await page.getByTestId('desktop-location-apply').click();

  await expect(page).toHaveURL(/location=Guadalajara%2C\+Jalisco/);
  await expect(page).toHaveURL(/state=Jalisco/);
  await expect(page).toHaveURL(/city=Guadalajara/);
  await expect(page.getByTestId('desktop-location-button')).toContainText('Guadalajara');
});

test('mobile header has a working search button and location cascade', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await page.goto('/');

  await page.getByTestId('mobile-search-input').fill('iPhone');
  await page.getByTestId('mobile-search-submit').click();
  await expect(page).toHaveURL(/search=iPhone/);

  await page.getByTestId('mobile-location-button').click();
  await page.getByTestId('mobile-location-state').selectOption('Nuevo León');
  await expect(page.getByTestId('mobile-location-city')).toBeEnabled();
  await page.getByTestId('mobile-location-city').selectOption('Monterrey');
  await page.getByTestId('mobile-location-apply').click();

  await expect(page).toHaveURL(/state=Nuevo\+Le%C3%B3n/);
  await expect(page).toHaveURL(/city=Monterrey/);
});


test('theme toggle exposes and changes its pressed state on desktop and mobile', async ({ page }, testInfo) => {
  test.skip(!['chromium-desktop', 'chromium-mobile'].includes(testInfo.project.name));
  await page.goto('/');
  const toggle = page.getByTestId(testInfo.project.name === 'chromium-mobile' ? 'mobile-theme-toggle' : 'desktop-theme-toggle');
  await expect(toggle).toBeVisible();
  const before = await toggle.getAttribute('aria-pressed');
  expect(['true', 'false']).toContain(before);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
});

async function mockPublicShellApi(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
  });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: { google: false, apple: false, telegram: false, sms: false } }) });
    }
    if (url.pathname.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes') || url.pathname.endsWith('/favorites')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}


test('2FA login challenge exposes a named code control', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.addInitScript(() => localStorage.setItem('cookie_consent', 'essential'));
  await mockPublicShellApi(page);
  await page.route('**/api/login', async route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ two_factor: true, email: 'qa-2fa@example.test', challenge_token: 'qa-two-factor-challenge' }),
  }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('desktop-account-button').click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="email"]').fill('qa-2fa@example.test');
  await dialog.locator('input[name="password"]').fill('ExamplePass99!');
  await dialog.locator('button[type="submit"]').click();
  const code = dialog.locator('input[name="code"]');
  await expect(code).toBeVisible();
  await expect(code).toHaveAttribute('aria-label', /\S+/);
  await expect(code).toBeFocused();
});

test('auth modal traps keyboard focus and restores the desktop or mobile opener', async ({ page }, testInfo) => {
  test.skip(!['chromium-desktop', 'chromium-mobile'].includes(testInfo.project.name));
  await page.addInitScript(() => localStorage.setItem('cookie_consent', 'essential'));
  await mockPublicShellApi(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const opener = testInfo.project.name === 'chromium-mobile'
    ? page.getByTestId('mobile-account-button')
    : page.getByTestId('desktop-account-button');
  await opener.focus();
  await expect(opener).toBeFocused();
  await opener.press('Enter');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const email = dialog.locator('input[name="email"]');
  await expect(email).toBeFocused();

  const focusables = dialog.locator('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
  const first = focusables.first();
  const last = focusables.last();
  await first.focus();
  await first.press('Shift+Tab');
  await expect(last).toBeFocused();
  await last.press('Tab');
  await expect(first).toBeFocused();

  await email.focus();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});
