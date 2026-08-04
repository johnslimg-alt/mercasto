import { expect, test } from '@playwright/test';

const buyer = {
  id: 101,
  name: 'Comprador Contact Return',
  email: 'contact-return@example.com',
  role: 'individual',
  phone_verified: true,
  email_verified_at: '2026-08-01T00:00:00Z',
};

const contactPath = '/mensajes?ad_id=42&seller_id=202&title=Bicicleta+urbana';

test('login restores the exact listing contact intent', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === '/api/login' && request.method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: buyer, access_token: 'contact-return-token' }),
      });
    }
    if (path === '/api/chat/conversations') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path === '/api/categories') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path === '/api/ads' || path.startsWith('/api/ads/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, current_page: 1, per_page: 16 }),
      });
    }
    if (path === '/api/broadcasting/auth') {
      return route.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto(contactPath, { waitUntil: 'domcontentloaded' });

  const loginForm = page.locator('form').filter({
    has: page.locator('input[name="email"]'),
  }).first();
  await expect(loginForm.locator('input[name="email"]')).toBeVisible();
  await loginForm.locator('input[name="email"]').fill(buyer.email);
  await loginForm.locator('input[name="password"]').fill('SecurePass123!');
  await loginForm.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/mensajes\?ad_id=42&seller_id=202&title=Bicicleta\+urbana$/);
  await expect(page.getByRole('heading', { name: 'Mensajes' })).toBeVisible();
  await expect(page.getByText('Bicicleta urbana').last()).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    intent: sessionStorage.getItem('mercasto.protected_route_intent.v1'),
    justRegistered: localStorage.getItem('just_registered'),
  }))).toEqual({ intent: null, justRegistered: null });
});
