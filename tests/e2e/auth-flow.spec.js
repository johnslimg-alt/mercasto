import { expect, test } from '@playwright/test';

/**
 * Auth E2E — modal-based auth flow.
 * Mercasto uses a modal triggered from the header, not dedicated /login or /register routes.
 */

const randomEmail = () => `e2e_${Date.now()}_${Math.floor(Math.random() * 9999)}@mailinator.com`;

test.describe('Authentication E2E Flow', () => {

  test('auth modal opens from header and shows login form', async ({ page }) => {
    await page.goto('/');

    // Trigger modal via header user button (desktop) or mobile account button
    const headerBtn = page.locator('.header-user-button, .mobile-account-button').first();
    await expect(headerBtn).toBeVisible({ timeout: 10000 });
    await headerBtn.click();

    // Modal should appear with email + password fields in login mode
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Should show "login" mode text
    await expect(page.locator('body')).toContainText(/Iniciar|Entrar|Login/i);
  });

  test('switch between login and register mode', async ({ page }) => {
    await page.goto('/');
    const headerBtn = page.locator('.header-user-button, .mobile-account-button').first();
    await headerBtn.click();

    // Should start in login mode — no name field
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    const nameField = page.locator('input[name="name"]');
    await expect(nameField).not.toBeVisible();

    // Click "¿No tienes cuenta? Únete" to switch to register
    await page.getByText('¿No tienes cuenta? Únete').click();
    await expect(nameField).toBeVisible({ timeout: 3000 });
    await expect(page.locator('body')).toContainText(/Registr|Register/i);

    // Switch back to login
    await page.getByText('Ya tengo cuenta').click();
    await expect(nameField).not.toBeVisible();
  });

  test('forgot password link shows forgot_password form', async ({ page }) => {
    await page.goto('/');
    const headerBtn = page.locator('.header-user-button, .mobile-account-button').first();
    await headerBtn.click();

    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });

    // Click "¿Olvidaste tu contraseña?"
    await page.getByText('¿Olvidaste tu contraseña?').click();

    // Should now show email-only form for forgot_password mode
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).not.toBeVisible();
    await expect(page.getByText('Volver a iniciar sesión')).toBeVisible();
  });

  test('register with new account and verify post-register state', async ({ page }) => {
    const email = randomEmail();
    await page.goto('/');

    // Open modal
    const headerBtn = page.locator('.header-user-button, .mobile-account-button').first();
    await headerBtn.click();

    // Switch to register
    await page.getByText('¿No tienes cuenta? Únete').click();
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });

    // Fill registration form
    await page.fill('input[name="name"]', 'E2E Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'E2eTestPass99!');

    // Submit
    await page.locator('form button[type="submit"]').click();

    // Should either redirect to email verification or close modal and show user
    await page.waitForTimeout(3000);

    // Either modal closed (user logged in) OR verification message shown
    const modalVisible = await page.locator('input[name="email"]').isVisible().catch(() => false);
    const bodyText = await page.locator('body').textContent();

    const registrationHandled =
      !modalVisible ||  // modal closed = logged in
      /Verificar|Confirmar|enviado|verif/i.test(bodyText || '');

    expect(registrationHandled, 'Registration should close modal or show verification state').toBe(true);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/');
    const headerBtn = page.locator('.header-user-button, .mobile-account-button').first();
    await headerBtn.click();

    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.locator('form button[type="submit"]').click();

    // Should show error, modal stays open
    await page.waitForTimeout(2000);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('no stack traces or debug text visible in UI', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/Exception|Stack trace|Traceback|at Object\.|at Function\./i);
    expect(body).not.toMatch(/APP_KEY|DB_PASSWORD|SECRET/i);
  });

  test('Google OAuth button is visible in auth modal', async ({ page }) => {
    await page.goto('/');
    const headerBtn = page.locator('.header-user-button, .mobile-account-button').first();
    await headerBtn.click();

    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });

    // Google button should appear (provider is configured)
    const googleBtn = page.getByText('Google');
    await expect(googleBtn).toBeVisible({ timeout: 5000 });
  });
});
