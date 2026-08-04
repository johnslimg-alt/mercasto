import { expect, test } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || `${process.env.BASE_URL || 'https://mercasto.com'}/api`;

const randomEmail = () => `e2e_${Date.now()}_${Math.floor(Math.random() * 9999)}@mailinator.com`;

const getModal = (page) =>
  page.locator('.fixed.inset-0').filter({ has: page.locator('input[name="email"], input[name="code"]') }).first();

async function dismissCookies(page) {
  const acceptCookies = page.locator('button:has-text("Aceptar")').first();
  await acceptCookies.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click().catch(() => {});
  }
}

async function openAuthModal(page) {
  const viewport = page.viewportSize();
  const btn = viewport && viewport.width >= 640
    ? page.locator('.header-user-button')
    : page.locator('.mobile-account-button');

  await expect(btn).toBeVisible({ timeout: 25000 });
  await btn.click();

  const modal = getModal(page);
  await expect(modal).toBeVisible({ timeout: 8000 });
  await expect(modal.locator('input[name="email"]')).toBeVisible({ timeout: 8000 });
  return modal;
}

async function switchToRegister(modal) {
  const registerSwitch = modal.locator('button').filter({ hasText: /No tienes cuenta|tienes cuenta|Únete|Crear/i }).first();
  await registerSwitch.click();
  await expect(modal.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });
}

async function registerUser(page, email, name = 'E2E Test User', password = 'E2eTestPass99!') {
  await dismissCookies(page);
  const modal = await openAuthModal(page);
  await switchToRegister(modal);
  await modal.locator('input[name="name"]').fill(name);
  await modal.locator('input[name="email"]').fill(email);
  await modal.locator('input[name="password"]').fill(password);
  await modal.locator('input[name="age_confirmed"]').check();
  await modal.locator('button[type="submit"]').click();

  await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 }).catch(() => {});

  const skipButton = page.locator('button').filter({ hasText: /Omitir|Skip/i }).first();
  await skipButton.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await skipButton.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
  }
}

test.describe('Authentication E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
    await dismissCookies(page);
  });

  test('auth modal opens and shows login form', async ({ page }) => {
    const modal = await openAuthModal(page);
    await expect(modal.locator('input[name="email"]')).toBeVisible();
    await expect(modal.locator('input[name="password"]')).toBeVisible();
    await expect(modal.locator('h2')).toContainText(/Iniciar Ses|Login/i);
  });

  test('switches between login and register mode', async ({ page }) => {
    const modal = await openAuthModal(page);
    await expect(modal.locator('input[name="name"]')).not.toBeVisible();
    await switchToRegister(modal);
    await modal.locator('button').filter({ hasText: /Ya tengo cuenta|Login|Iniciar/i }).first().click();
    await expect(modal.locator('input[name="name"]')).not.toBeVisible();
  });

  test('forgot password form is available', async ({ page }) => {
    const modal = await openAuthModal(page);
    await modal.locator('button').filter({ hasText: /Olvidaste|Forgot/i }).first().click();
    await expect(modal.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('input[name="password"]')).not.toBeVisible();
    await expect(modal).toContainText(/Volver|iniciar sesión|Login/i);
  });

  test('registers a new account and reaches post-register state', async ({ page }) => {
    const email = randomEmail();
    await registerUser(page, email);

    const bodyText = await page.locator('body').textContent();
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(Boolean(token) || /Verifica|Reenviar|Confirmar|enviado|verif/i.test(bodyText || '')).toBe(true);
  });

  test('invalid login stays in auth modal', async ({ page }) => {
    const modal = await openAuthModal(page);
    await modal.locator('input[name="email"]').fill('nonexistent@example.com');
    await modal.locator('input[name="password"]').fill('WrongPassword123!');
    await modal.locator('input[name="password"]').press('Enter');

    await page.waitForTimeout(2000);
    await expect(modal.locator('input[name="email"]')).toBeVisible();
  });

  test('OAuth buttons follow the provider availability contract', async ({ page, request }) => {
    const response = await request.get(`${API_BASE_URL}/auth/providers`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const providers = payload.providers ?? payload;

    await openAuthModal(page);
    const googleButton = page.getByRole('button', { name: 'Google' });
    if (providers.google === true || providers.google?.enabled === true) {
      await expect(googleButton).toBeVisible({ timeout: 5000 });
    } else {
      await expect(googleButton).toHaveCount(0);
    }
  });

  test('no stack traces or secrets are visible in public UI', async ({ page }) => {
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/Exception|Stack trace|Traceback|at Object\.|at Function\./i);
    expect(body).not.toMatch(/APP_KEY|DB_PASSWORD|SECRET/i);
  });

  test('registered user can log out and log back in', async ({ page }) => {
    const email = randomEmail();
    const password = 'E2eTestPass99!';
    await registerUser(page, email, 'E2E Login User', password);

    await page.goto('/profile');
    const accountButton = page.getByRole('button', { name: /E2E Login User|Abrir menú de cuenta/i }).filter({ visible: true }).first();
    await expect(accountButton).toBeVisible({ timeout: 10000 });
    await accountButton.click();
    const logoutButton = page.getByRole('button', { name: 'Salir' }).filter({ visible: true }).first();
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();

    await page.goto('/');
    const modal = await openAuthModal(page);
    await modal.locator('input[name="email"]').fill(email);
    await modal.locator('input[name="password"]').fill(password);
    await modal.locator('input[name="password"]').press('Enter');

    await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 }).catch(() => {});
    await page.goto('/profile');
    await expect(page.locator('body')).toContainText(/E2E Login User|Cuenta|Perfil/i);
  });
});
