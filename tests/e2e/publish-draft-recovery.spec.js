import { expect, test } from '@playwright/test';

const seller = {
  id: 303,
  name: 'Draft Seller',
  email: 'draft-seller@example.com',
  role: 'individual',
  phone_verified: true,
  email_verified_at: '2026-08-01T00:00:00Z',
};

test('publication restores a same-session text draft without pretending files were saved', async ({ page }) => {
  await page.addInitScript(({ user, savedAt }) => {
    localStorage.setItem('auth_token', 'draft-e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('cookiesAccepted', 'true');
    sessionStorage.setItem('mercasto.publish_draft.v1', JSON.stringify({
      version: 1,
      savedAt,
      step: 2,
      form: {
        title: 'Bicicleta urbana recuperada',
        price: '3500',
        description: 'Borrador de prueba',
        location: '',
        city: '',
        state: '',
        latitude: '',
        longitude: '',
        category: 'productos',
        subcategory: '',
        condition: 'usado',
        attributes: {},
      },
      contact: {
        contactMethods: ['whatsapp'],
        waMode: 'phone',
        phoneValue: '5512345678',
        waUsername: '',
        telegramValue: '',
      },
    }));
  }, { user: seller, savedAt: Date.now() });

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/user') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(seller) });
    }
    if (path === '/api/categories') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path === '/api/category-attributes') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path === '/api/ads' || path.startsWith('/api/ads/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, current_page: 1, per_page: 16 }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/post', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('publish-draft-restored')).toContainText('Recuperamos tu borrador');
  await expect(page.locator('input[placeholder="Ej: Honda Civic 2018"]')).toBeVisible();
  await expect(page.getByText(/0\/10/)).toBeVisible();
  await expect(page.getByText(/Fotos del anuncio|Fotos/).first()).toBeVisible();
});
