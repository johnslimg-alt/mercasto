import { expect, test } from '@playwright/test';

const SELLER_EMAIL = process.env.E2E_SELLER_EMAIL;
const SELLER_PASSWORD = process.env.E2E_SELLER_PASSWORD;
const API_BASE_URL = process.env.API_BASE_URL || `${process.env.BASE_URL || 'https://mercasto.com'}/api`;

test.skip(!SELLER_EMAIL || !SELLER_PASSWORD, 'Dedicated production seller credentials are required.');

const authModal = (page) => page.locator('.fixed.inset-0')
  .filter({ has: page.locator('input[name="email"], input[name="code"]') })
  .first();

async function login(page) {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('cookiesAccepted', 'true'); });
  const userButton = page.locator('.header-user-button, .mobile-account-button').filter({ visible: true }).first();
  await expect(userButton).toBeVisible();
  await userButton.click();
  const modal = authModal(page);
  await expect(modal).toBeVisible({ timeout: 5000 });
  await modal.locator('input[name="email"]').fill(SELLER_EMAIL);
  await modal.locator('input[name="password"]').fill(SELLER_PASSWORD);
  await modal.locator('input[name="password"]').press('Enter');
  await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 });
  const skip = page.getByRole('button', { name: /Omitir|Skip/i }).first();
  await skip.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

test.describe('Production seller read-only smoke', () => {
  test('authenticates and reads seller profile/listings without mutation', async ({ page, request }) => {
    await login(page);
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE_URL}/user`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    expect(me.ok()).toBeTruthy();

    const ads = await request.get(`${API_BASE_URL}/user/ads`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    expect(ads.ok()).toBeTruthy();
    const payload = await ads.json();
    const rows = payload.data || payload.ads || payload;
    expect(Array.isArray(rows)).toBeTruthy();

    await page.goto('/profile');
    await expect(page.getByTestId('dashboard-ai-brand-message')).toBeVisible({ timeout: 10000 });
  });

  test('opens the authenticated publish flow without submitting data', async ({ page }) => {
    await login(page);
    await page.goto('/post');
    await expect(page.getByTestId('publish-ai-brand-message')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Selecciona una Categoría|Select a Category/i).first()).toBeVisible();
    await expect(page.locator('form').filter({ hasText: /Selecciona una Categoría|Select a Category/i }).first()).toBeVisible();
  });
});
