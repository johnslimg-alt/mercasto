import { expect, test } from '@playwright/test';

test.describe('Authentication E2E Flow', () => {
  const randomEmail = `testuser_${Math.floor(Math.random() * 100000)}@example.com`;

  test.beforeEach(async ({ page }) => {
    // Navigate to homepage and clear state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  });

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');

    // Verify form exists
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/Registrarse|Register/i);

    // Fill registration form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[name="phone"]', '+34600123456');
    await page.fill('input[name="password"]', 'StrongPass123!');
    await page.fill('input[name="password_confirmation"]', 'StrongPass123!');

    // Accept terms
    await page.click('input[type="checkbox"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect or display a verification state
    await page.waitForURL('**/verificar-email**', { timeout: 10000 }).catch(() => {});
    await expect(page.locator('body')).toContainText(/Verificar|Confirmar|verification|enviado/i);
  });

  test('should log in and show 2FA prompt when enabled', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', 'StrongPass123!');
    
    // Submit
    await page.click('button[type="submit"]');

    // If 2FA is triggered, verify the OTP input screen is displayed
    const codeInput = page.locator('input[name="code"], input[placeholder*="2FA"], input[placeholder*="OTP"]');
    if (await codeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(page.locator('body')).toContainText(/Código|Verification Code|Two-Factor/i);
      
      // Enter mock 2FA code
      await codeInput.fill('123456');
      await page.click('button[type="submit"]');
    }

    // Should redirect to account dashboard
    await page.waitForURL('**/account**', { timeout: 15000 }).catch(() => {});
    await expect(page.locator('body')).toContainText(/Mi cuenta|My Account|Dashboard|Panel/i);
  });

  test('should request password reset successfully', async ({ page }) => {
    await page.goto('/login');
    
    // Click on forgot password link
    await page.click('a[href*="forgot-password"], a:has-text("Contraseña"), a:has-text("Forgot")');
    
    await expect(page.locator('h1')).toContainText(/Restablecer|Recuperar|Forgot Password/i);
    await page.fill('input[type="email"]', randomEmail);
    await page.click('button[type="submit"]');

    // Should show success alert
    await expect(page.locator('body')).toContainText(/enviado|sent|enlace|link/i);
  });

  test('should perform secure account deletion sequence', async ({ page }) => {
    // Perform programmatic/mock login first to get to account dashboard
    await page.goto('/login');
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', 'StrongPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/account**', { timeout: 10000 }).catch(() => {});

    // Go to settings or delete account section
    await page.goto('/account');
    
    // Find and click delete button
    const deleteButton = page.locator('button:has-text("Eliminar cuenta"), button:has-text("Delete account")');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Confirm in modal
    await expect(page.locator('div[role="dialog"], .modal')).toBeVisible();
    await page.fill('input[placeholder*="contraseña"], input[placeholder*="password"]', 'StrongPass123!');
    
    // Final confirm click
    await page.click('.modal button:has-text("Eliminar"), .modal button:has-text("Delete")');

    // Should be redirected to home and logged out
    await page.waitForURL('/');
    await expect(page.locator('body')).not.toContainText(/Mi cuenta|Dashboard|Account/i);
  });
});
