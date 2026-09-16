import { test, expect } from '@playwright/test';

async function mockPublicShellApi(page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'light');
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('cookiesAccepted', 'true');
  });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const json = value => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(value),
    });
    if (url.pathname.endsWith('/auth/providers')) {
      return json({ providers: { google: false, apple: false, telegram: false, sms: false } });
    }
    if (url.pathname.endsWith('/ads')) return json({ data: [], total: 0, current_page: 1, last_page: 1 });
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes') || url.pathname.endsWith('/favorites')) return json([]);
    if (url.pathname.endsWith('/banners')) return json({ banners: [] });
    return json({ data: [] });
  });
}

test.beforeEach(async ({ page }) => {
  await mockPublicShellApi(page);
});

test('desktop Golden Home search and location preserve URL filters', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('golden-desktop-search-input').fill('Toyota');
  await page.getByTestId('golden-desktop-search-submit').click();
  await expect(page).toHaveURL(/\/listings\?search=Toyota/);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('golden-location-button').click();
  await page.getByTestId('golden-location-state').selectOption('Jalisco');
  await expect(page.getByTestId('golden-location-city')).toBeEnabled();
  await page.getByTestId('golden-location-city').selectOption('Guadalajara');
  await page.getByTestId('golden-location-apply').click();

  await expect(page).toHaveURL(/\/listings\?/);
  await expect(page).toHaveURL(/location=Guadalajara/);
  await expect(page).toHaveURL(/state=Jalisco/);
  await expect(page).toHaveURL(/city=Guadalajara/);
});

test('mobile Golden Home search and location cascade work', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('golden-mobile-search-input').fill('iPhone');
  await page.getByTestId('golden-mobile-search-input').press('Enter');
  await expect(page).toHaveURL(/\/listings\?search=iPhone/);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('golden-location-button').click();
  await page.getByTestId('golden-location-state').selectOption('Nuevo León');
  await page.getByTestId('golden-location-city').selectOption('Monterrey');
  await page.getByTestId('golden-location-apply').click();

  await expect(page).toHaveURL(/state=Nuevo\+Le%C3%B3n/);
  await expect(page).toHaveURL(/city=Monterrey/);
});

test('Golden Home theme toggle changes and persists the first click', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  let toggle = page.getByTestId('golden-theme-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => ({
    stored: localStorage.getItem('theme'),
    dark: document.documentElement.classList.contains('dark'),
  }))).toEqual({ stored: 'dark', dark: true });

  await page.reload({ waitUntil: 'domcontentloaded' });
  toggle = page.getByTestId('golden-theme-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
});

test('2FA login challenge exposes a named code control', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.route('**/api/login', async route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      two_factor: true,
      email: 'qa-2fa@example.test',
      challenge_token: 'qa-two-factor-challenge',
    }),
  }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('golden-account-button').click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="email"]').fill('qa-2fa@example.test');
  await dialog.locator('input[name="password"]').fill('ExamplePass99!');
  await dialog.locator('button[type="submit"]').click();
  const code = dialog.locator('input[name="code"]');
  await expect(code).toBeVisible();
  await expect(code).toHaveAttribute('aria-label', /\S+/);
  await expect(code).toBeFocused();
});

test('auth modal traps focus and restores the Golden Home opener', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const opener = page.getByTestId(
    testInfo.project.name.includes('mobile') ? 'golden-mobile-account-tab' : 'golden-account-button',
  );
  await opener.focus();
  await expect(opener).toBeFocused();
  await opener.press('Enter');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const email = dialog.locator('input[name="email"]');
  await expect(email).toBeFocused();

  const focusables = dialog.locator(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
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
