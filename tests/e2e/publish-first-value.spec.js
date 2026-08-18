import { expect, test } from '@playwright/test';
import t from '../../src/constants/translations/es.js';

const user = {
  id: 501,
  name: 'Nuevo vendedor',
  email: 'seller-first-value@example.test',
  role: 'individual',
  is_verified: true,
  account_verified: true,
  onboarding_completed_at: '2026-08-14T00:00:00Z',
};

async function installSession(page) {
  await page.addInitScript(({ sessionUser }) => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('auth_token', 'first-value-token');
    localStorage.setItem('user', JSON.stringify(sessionUser));
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  }, { sessionUser: user });
}

async function mockApi(page, capture) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith('/user') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (path.endsWith('/categories')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 99, slug: 'qa-test', name: { es: 'Otros' } }]),
      });
    }
    if (path.includes('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/user/profile') && method === 'POST') {
      capture.profileUpdated = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...user, phone_number: '5512345678', whatsapp: '5512345678' }),
      });
    }
    if (path.endsWith('/ads') && method === 'POST') {
      capture.adBody = request.postData() || '';
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 7001, status: 'pending', category: 'qa-test' }),
      });
    }
    if (path.endsWith('/user/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/user/favorite-ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ google: false, apple: false, sms: false, twitter: false, telegram: false }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expectMinHeight(locator, min = 48) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(min);
}

test('new seller can publish with city and WhatsApp without placing a map pin', async ({ page }) => {
  const capture = { profileUpdated: false, adBody: '' };
  await installSession(page);
  await mockApi(page, capture);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/post', { waitUntil: 'domcontentloaded' });

  await page.getByRole('main').getByRole('button', { name: 'Otros', exact: true }).click();
  await page.getByRole('button', { name: t.next_btn, exact: true }).click();
  await page.getByTestId('publish-title').fill('Mesa para comedor');
  await page.getByTestId('publish-price').fill('2500');
  await page.getByTestId('publish-description').fill('Mesa en buen estado, lista para recoger.');
  await page.getByRole('button', { name: t.next_btn, exact: true }).click();

  await expect(page.getByTestId('publish-phone')).toBeVisible();
  await expect(page.getByTestId('publish-location-optional')).toContainText('Opcional');
  await page.getByTestId('publish-state').selectOption('Aguascalientes');
  await page.getByTestId('publish-city').selectOption('Aguascalientes');
  await page.getByTestId('publish-phone').fill('55 1234 5678');

  const publish = page.getByRole('button', { name: t.publish_btn, exact: true }).filter({ visible: true });
  await expect(publish).toBeEnabled();
  await publish.click();

  await expect(page).toHaveURL(/\/profile\?tab=my_ads$/);
  await expect(page.getByText(t.listing_action_publish_submitted, { exact: true })).toBeVisible();
  expect(capture.profileUpdated).toBe(true);
  expect(capture.adBody).toContain('name="city"');
  expect(capture.adBody).not.toContain('name="latitude"');
  expect(capture.adBody).not.toContain('name="longitude"');
});

test('mobile publish controls keep 48px tap targets without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  const capture = { profileUpdated: false, adBody: '' };
  await installSession(page);
  await mockApi(page, capture);

  for (const width of [360, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/post', { waitUntil: 'domcontentloaded' });

    await page.getByRole('main').getByRole('button', { name: 'Otros', exact: true }).click();
    await page.getByRole('button', { name: t.next_btn, exact: true }).click();

    await expectMinHeight(page.getByTestId('publish-title'));
    await expectMinHeight(page.getByTestId('publish-price'));
    await expectMinHeight(page.getByRole('combobox', { name: t.condition, exact: true }));
    await expectMinHeight(page.getByTestId('publish-generate-ai'));

    await page.getByTestId('publish-title').fill('Mesa para comedor');
    await page.getByTestId('publish-price').fill('2500');
    await page.getByTestId('publish-description').fill('Mesa en buen estado, lista para recoger.');
    await page.getByRole('button', { name: t.next_btn, exact: true }).click();

    await page.getByTestId('publish-state').selectOption('Aguascalientes');
    await page.getByTestId('publish-city').selectOption('Aguascalientes');
    await expectMinHeight(page.getByTestId('publish-state'));
    await expectMinHeight(page.getByTestId('publish-city'));
    await expectMinHeight(page.getByTestId('publish-gps'));
    await expectMinHeight(page.getByTestId('publish-whatsapp-mode-phone'));
    await expectMinHeight(page.getByTestId('publish-whatsapp-mode-username'));
    await expectMinHeight(page.getByTestId('publish-phone'));

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
