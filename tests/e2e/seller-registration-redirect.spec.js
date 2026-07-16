import { expect, test } from '@playwright/test';

const registeredUser = {
  id: 991001,
  name: 'Seller Redirect Test',
  email: 'seller-redirect@example.com',
  role: 'individual',
  phone_verified: true,
  email_verified_at: '2026-07-15T00:00:00Z',
};

test.describe('seller campaign registration return', () => {
  test('opens the publication form after successful registration', async ({ page }) => {
    await page.route('**/api/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: registeredUser,
          access_token: 'e2e-registration-token',
        }),
      });
    });

    await page.goto('/vendedores', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Publicar Anuncio Gratis' }).first().click();

    await expect(page.getByRole('button', { name: '¿No tienes cuenta? Únete' })).toBeVisible();
    await page.getByRole('button', { name: '¿No tienes cuenta? Únete' }).click();

    const registrationForm = page.locator('form').filter({
      has: page.locator('input[name="name"]'),
    });

    await registrationForm.locator('input[name="name"]').fill(registeredUser.name);
    await registrationForm.locator('input[name="email"]').fill(registeredUser.email);
    await registrationForm.locator('input[name="password"]').fill('SecurePass123!');
    await registrationForm.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/post$/);
    await expect.poll(() => page.evaluate(() => (
      sessionStorage.getItem('mercasto.protected_route_intent.v1')
    ))).toBeNull();
  });
});
