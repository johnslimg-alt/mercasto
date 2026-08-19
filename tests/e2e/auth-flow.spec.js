import { expect, test } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || `${process.env.BASE_URL || 'https://mercasto.com'}/api`;
const ISOLATED_STACK = process.env.E2E_ISOLATED_STACK === '1';
const RESET_NEW_PASSWORD = process.env.E2E_RESET_NEW_PASSWORD || 'E2eNewPass99!';

function projectFixture(projectName, kind) {
  const mobile = projectName.includes('mobile');
  const suffix = mobile ? 'MOBILE' : 'DESKTOP';
  if (kind === 'reset') {
    return {
      email: process.env[`E2E_RESET_EMAIL_${suffix}`],
      token: process.env[`E2E_RESET_TOKEN_${suffix}`],
    };
  }
  return {
    email: process.env[`E2E_2FA_EMAIL_${suffix}`],
    password: process.env[`E2E_2FA_PASSWORD_${suffix}`],
    recoveryCode: process.env[`E2E_2FA_RECOVERY_${suffix}`],
  };
}

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

  const onboarding = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /Bienvenido a Mercasto|Welcome to Mercasto/i }) }).first();
  await onboarding.waitFor({ state: 'visible', timeout: 2500 }).catch(() => {});
  if (await onboarding.isVisible().catch(() => false)) {
    const closeButton = onboarding.getByRole('button', { name: /Cerrar|Close/i }).first();
    await closeButton.click();
    await onboarding.waitFor({ state: 'hidden', timeout: 5000 });
  }
}

test.describe('Authentication E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
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

  test('completes password reset and logs in with the new password', async ({ page }, testInfo) => {
    test.skip(!ISOLATED_STACK, 'Password reset completion uses isolated reset-token fixtures.');
    const fixture = projectFixture(testInfo.project.name, 'reset');
    expect(fixture.email).toBeTruthy();
    expect(fixture.token).toBeTruthy();

    await page.goto(`/?reset_token=${encodeURIComponent(fixture.token)}&email=${encodeURIComponent(fixture.email)}`);
    const modal = page.locator('.fixed.inset-0').filter({ has: page.locator('input[name="password_confirmation"]') }).first();
    await expect(modal).toBeVisible({ timeout: 8000 });
    await expect(modal.locator('input[name="password_confirmation"]')).toBeVisible();
    await modal.locator('input[name="password"]').fill(RESET_NEW_PASSWORD);
    await modal.locator('input[name="password_confirmation"]').fill(RESET_NEW_PASSWORD);
    await modal.locator('button[type="submit"]').click();

    const loginModal = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /Iniciar Sesión|Login/i }),
    }).first();
    await expect(loginModal).toBeVisible({ timeout: 8000 });
    const emailInput = loginModal.locator('input[type="email"][name="email"]');
    const passwordInput = loginModal.locator('input[type="password"][name="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await emailInput.fill(fixture.email);
    await expect(emailInput).toHaveValue(fixture.email);
    await passwordInput.fill(RESET_NEW_PASSWORD);
    await expect(passwordInput).toHaveValue(RESET_NEW_PASSWORD);
    await expect(emailInput).toHaveValue(fixture.email);
    await loginModal.getByRole('button', { name: /Iniciar Sesión|Login/i }).click();
    await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 });
  });

  test('completes the 2FA challenge with a one-time recovery code', async ({ page }, testInfo) => {
    test.skip(!ISOLATED_STACK, '2FA verification uses isolated recovery-code fixtures.');
    const fixture = projectFixture(testInfo.project.name, 'two-factor');
    expect(fixture.email).toBeTruthy();
    expect(fixture.password).toBeTruthy();
    expect(fixture.recoveryCode).toBeTruthy();

    const modal = await openAuthModal(page);
    await modal.locator('input[name="email"]').fill(fixture.email);
    await modal.locator('input[name="password"]').fill(fixture.password);
    await modal.locator('input[name="password"]').press('Enter');

    await expect(modal.getByRole('heading', { name: /Verificación de dos pasos/i })).toBeVisible({ timeout: 8000 });
    const codeInput = modal.locator('input[name="code"]');
    await expect(codeInput).toHaveAttribute('maxlength', '32');
    await codeInput.fill(fixture.recoveryCode);
    await modal.getByRole('button', { name: /Verificar e Iniciar Sesión/i }).click();
    await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 });
  });

  test('deletes a newly registered account through the browser UI', async ({ page, request }) => {
    test.skip(!ISOLATED_STACK, 'Account deletion must never mutate a production account.');
    const email = randomEmail();
    const password = 'E2eDeletePass99!';
    await registerUser(page, email, 'E2E Delete User', password);
    await page.goto('/profile');

    await page.getByRole('button', { name: /Ajustes|Configuración|Settings/i }).first().click();
    const deleteButton = page.getByRole('button', { name: /Eliminar Cuenta|Delete Account/i }).first();
    await expect(deleteButton).toBeVisible({ timeout: 8000 });

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/eliminar tu cuenta|delete your account/i);
      await dialog.accept();
    });
    const deletionResponse = page.waitForResponse((response) => (
      response.url().endsWith('/api/user') && response.request().method() === 'DELETE'
    ));
    await deleteButton.click();
    expect((await deletionResponse).status()).toBe(200);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();

    const loginResponse = await request.post(`${API_BASE_URL}/login`, {
      data: { email, password },
      headers: { Accept: 'application/json' },
    });
    expect(loginResponse.status()).toBe(422);
  });

  test('registered user can log out and log back in', async ({ page }) => {
    const email = randomEmail();
    const password = 'E2eTestPass99!';
    await registerUser(page, email, 'E2E Login User', password);

    await page.goto('/profile');
    const accountButton = page.getByRole('button', { name: /E2E Login User|Abrir menú de cuenta/i }).filter({ visible: true }).first();
    await expect(accountButton).toBeVisible({ timeout: 10000 });
    await accountButton.click();
    const logoutButton = page.getByRole('button', { name: /Cerrar sesión|Salir|Log out|Logout/i }).filter({ visible: true }).first();
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
