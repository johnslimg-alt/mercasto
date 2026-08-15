import { expect, test } from '@playwright/test';
import t from '../../src/constants/translations/en.js';

const baseUser = {
  id: 811,
  name: 'Seller Email QA',
  email: 'seller-email@example.test',
  role: 'individual',
  is_verified: true,
  account_verified: true,
  notification_preferences: {
    email_alerts: true,
    email_new_message: true,
    push_notifications: false,
    marketing: false,
    locale: 'es',
  },
};

async function installSession(page) {
  await page.addInitScript(({ user }) => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('auth_token', 'message-email-return-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  }, { user: baseUser });
}

async function mockApi(page, posts) {
  let preferences = { ...baseUser.notification_preferences };
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/user/notifications') && request.method() === 'POST') {
      const body = request.postDataJSON();
      posts.push(body);
      preferences = { ...preferences, ...body };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { ...baseUser, notification_preferences: preferences } }),
      });
    }
    if (path.endsWith('/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...baseUser, notification_preferences: preferences }) });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/user/ads') || path.endsWith('/user/favorite-ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test('seller language is persisted for message email and the dedicated toggle is saved', async ({ page }) => {
  const posts = [];
  await installSession(page);
  await mockApi(page, posts);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/profile', { waitUntil: 'domcontentloaded' });

  await expect.poll(() => posts.some(body => body.locale === 'en')).toBe(true);
  await page.getByTestId('dashboard-tab-settings').click();

  const messageToggle = page.getByTestId('email-new-message-toggle');
  await expect(page.getByText(t.email_new_message, { exact: true })).toBeVisible();
  await expect(messageToggle).toBeChecked();
  await messageToggle.uncheck();

  const form = page.locator('form').filter({ has: messageToggle });
  await form.getByRole('button', { name: t.save_changes, exact: true }).click();
  await expect.poll(() => posts.some(body => body.email_new_message === false && body.locale === 'en')).toBe(true);

  const masterEmail = form.getByRole('checkbox').first();
  await masterEmail.uncheck();
  await expect(messageToggle).toBeDisabled();
});
