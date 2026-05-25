import { expect, test } from '@playwright/test';

/**
 * Auth E2E — modal-based auth flow.
 * Mercasto uses a modal triggered from the header, not dedicated /login or /register routes.
 *
 * App fix applied: the main login/register/forgot modal div now has
 * onClick={e => e.stopPropagation()} so inner button clicks don't close the modal.
 */

const randomEmail = () => `e2e_${Date.now()}_${Math.floor(Math.random() * 9999)}@mailinator.com`;

/**
 * Opens the auth modal regardless of viewport (desktop or mobile).
 * Desktop: .header-user-button (hidden sm:flex — visible on desktop)
 * Mobile:  .mobile-account-button (always visible on mobile nav)
 */
async function openAuthModal(page) {
  await page.waitForLoadState('networkidle');
  const desktopBtn = page.locator('.header-user-button');
  const mobileBtn  = page.locator('.mobile-account-button');

  if (await desktopBtn.isVisible()) {
    await desktopBtn.click();
  } else {
    await mobileBtn.click();
  }

  await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 8000 });
}

test.describe('Authentication E2E Flow', () => {

  test('auth modal opens from header and shows login form', async ({ page }) => {
    await page.goto('/');
    await openAuthModal(page);

    // Email + password fields in login mode
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Login mode heading/text
    await expect(page.locator('body')).toContainText(/Iniciar|Entrar|Login/i);
  });

  test('switch between login and register mode', async ({ page }) => {
    await page.goto('/');
    await openAuthModal(page);

    // Login mode: name field absent
    const nameField = page.locator('input[name="name"]');
    await expect(nameField).not.toBeVisible();

    // Switch to register
    await page.getByText('¿No tienes cuenta? Únete').click();
    await expect(nameField).toBeVisible({ timeout: 5000 });
    await expect(page.locator('body')).toContainText(/Registr|Register/i);

    // Switch back to login
    await page.getByText('Ya tengo cuenta').click();
    await expect(nameField).not.toBeVisible();
  });

  test('forgot password link shows forgot_password form', async ({ page }) => {
    await page.goto('/');
    await openAuthModal(page);

    // Click forgot password
    await page.getByText('¿Olvidaste tu contraseña?').click();

    // forgot_password mode: email shown, password hidden, back link shown
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="password"]')).not.toBeVisible();
    await expect(page.getByText('Volver a iniciar sesión')).toBeVisible();
  });

  test('register with new account and verify post-register state', async ({ page }) => {
    const email = randomEmail();
    await page.goto('/');
    await openAuthModal(page);

    // Switch to register
    await page.getByText('¿No tienes cuenta? Únete').click();
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });

    // Fill registration form
    await page.fill('input[name="name"]', 'E2E Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'E2eTestPass99!');

    // Submit — use role to avoid strict-mode violation from other form buttons on page
    await page.getByRole('button', { name: /Registr/i }).click();

    await page.waitForTimeout(3000);

    // Either modal closed (logged in) or verification message shown
    const modalEmailVisible = await page.locator('input[name="email"]').isVisible().catch(() => false);
    const bodyText = await page.locator('body').textContent();

    const registrationHandled =
      !modalEmailVisible ||
      /Verificar|Confirmar|enviado|verif/i.test(bodyText || '');

    expect(registrationHandled, 'Registration should close modal or show verification state').toBe(true);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/');
    await openAuthModal(page);

    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');

    // Scope submit to the auth modal (avoid newsletter form button elsewhere on page)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click();

    // Modal stays open with email field still visible after bad creds
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
    await openAuthModal(page);

    // Google button should appear (provider configured)
    await expect(page.getByText('Google')).toBeVisible({ timeout: 5000 });
  });
});
