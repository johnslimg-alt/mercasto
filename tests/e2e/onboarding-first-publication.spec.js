import { expect, test } from '@playwright/test';

const newUser = {
  id: 991296,
  name: 'Nueva Vendedora',
  email: 'onboarding@example.test',
  role: 'individual',
  phone_verified: false,
  onboarding_completed_at: null,
  onboarding_skipped_at: null,
};

async function prepareOrganicRegistration(page, options = {}) {
  const payloads = [];
  await page.addInitScript((user) => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'onboarding-e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('just_registered', '1');
    localStorage.removeItem('onboarding_done');
    localStorage.removeItem('onboarding_pending_sync');
  }, newUser);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === '/api/user/preferences' && request.method() === 'POST') {
      payloads.push(request.postDataJSON());
      return route.fulfill({
        status: options.preferenceStatus || 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
    if (path === '/api/user' && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newUser) });
    }
    if (path === '/api/auth/providers') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ google: false, apple: false, twitter: false, telegram: false, sms: false }),
      });
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
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /¡Bienvenido/ })).toBeVisible();
  return payloads;
}

test('seller onboarding persists completion and opens the real publication route', async ({ page }) => {
  const payloads = await prepareOrganicRegistration(page);

  let onboarding = page.getByRole('dialog', { name: /¡Bienvenido/ });
  await onboarding.getByRole('button', { name: /Siguiente/ }).click();
  onboarding = page.getByRole('dialog', { name: /¿Qué quieres hacer/ });
  await onboarding.getByRole('button', { name: /^Vender/ }).click();
  await page.getByRole('button', { name: /Siguiente/ }).click();

  // Interests are optional; onboarding must not block the first publication.
  await expect(page.getByRole('button', { name: /Siguiente/ })).toBeEnabled();
  await page.getByRole('button', { name: /Siguiente/ }).click();
  await page.getByRole('button', { name: /Finalizar/ }).click();
  await page.getByRole('button', { name: /Crear mi primer anuncio/ }).click();

  await expect(page).toHaveURL(/\/post$/);
  await expect(page.getByRole('heading', { name: 'Pon tu anuncio' })).toBeVisible();
  expect(payloads).toHaveLength(1);
  expect(payloads[0].preferred_role).toBe('seller');
  expect(payloads[0].preferred_categories).toEqual([]);
  expect(payloads[0].onboarding_completed_at).toBeTruthy();
  expect(payloads[0].onboarding_skipped_at).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('just_registered'))).toBeNull();
});

test('closing onboarding persists a server-side skipped state', async ({ page }) => {
  const payloads = await prepareOrganicRegistration(page);

  await page.getByRole('dialog', { name: /¡Bienvenido/ }).getByRole('button', { name: 'Cerrar' }).click();

  await expect(page.getByRole('heading', { name: /¡Bienvenido/ })).toHaveCount(0);
  expect(payloads).toHaveLength(1);
  expect(payloads[0].onboarding_completed_at).toBeNull();
  expect(payloads[0].onboarding_skipped_at).toBeTruthy();
  await expect.poll(() => page.evaluate(() => ({
    done: localStorage.getItem('onboarding_done'),
    justRegistered: localStorage.getItem('just_registered'),
  }))).toEqual({ done: '1', justRegistered: null });
});

test('server-resolved onboarding is not shown again', async ({ page }) => {
  const resolvedUser = {
    ...newUser,
    onboarding_skipped_at: '2026-08-05T23:59:00Z',
  };
  await page.addInitScript((user) => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'onboarding-e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('just_registered', '1');
    localStorage.removeItem('onboarding_done');
  }, resolvedUser);
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/user') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resolvedUser) });
    }
    if (path === '/api/auth/providers') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"sms":false}' });
    }
    if (path === '/api/categories') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await expect(page.getByRole('heading', { name: /¡Bienvenido/ })).toHaveCount(0);
});
