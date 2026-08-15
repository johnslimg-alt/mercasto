import { expect, test } from '@playwright/test';
import t from '../../src/constants/translations/es.js';

const user = {
  id: 701,
  name: 'Vendedor QA',
  email: 'seller-response@example.test',
  role: 'individual',
  is_verified: true,
  account_verified: true,
};
const messageNotification = {
  id: 91,
  type: 'message',
  title: 'Comprador QA',
  message: 'Hola, sigue disponible?',
  link: '/mensajes?conversation=77',
  is_read: 0,
  created_at: '2026-08-14T20:00:00Z',
  data: {
    conversation_id: 77,
    ad_id: 801,
    listing_id: 801,
    sender_id: 702,
    sender_name: 'Comprador QA',
    ad_title: 'Bicicleta urbana',
  },
};
const conversation = {
  conversation_id: 77,
  user_id: 702,
  name: 'Comprador QA',
  ad_id: 801,
  ad: { id: 801, title: 'Bicicleta urbana', price: 3500 },
  last_message: messageNotification.message,
  created_at: messageNotification.created_at,
  unread_count: 1,
  is_read: false,
};

async function installSession(page) {
  await page.addInitScript(({ sessionUser }) => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('auth_token', 'first-response-token');
    localStorage.setItem('user', JSON.stringify(sessionUser));
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  }, { sessionUser: user });
}

async function mockApi(page) {
  let notificationRead = false;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path.endsWith('/user') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (path.endsWith('/user/notifications/list')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ ...messageNotification, is_read: notificationRead ? 1 : 0 }]) });
    }
    if (path.endsWith('/notifications/unread-count')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: notificationRead ? 0 : 1 }) });
    }
    if (path.endsWith('/notifications') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ ...messageNotification, is_read: notificationRead ? 1 : 0 }], next_page_url: null }) });
    }
    if (path.endsWith('/notifications/91/read') || path.endsWith('/user/notifications/91/read')) {
      notificationRead = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
    if (path.endsWith('/chat/conversations') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([conversation]) });
    }
    if (path.endsWith('/chat/conversations/77/messages') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversation: { ...conversation, unread_count: 0, is_read: true }, messages: [] }),
      });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/user/ads') || path.endsWith('/user/favorite-ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test('mobile seller opens a first-response notification and lands in the exact conversation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installSession(page);
  await mockApi(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const tabbar = page.locator('.mobile-tabbar');
  await expect(tabbar).toBeVisible();
  await expect(page.getByTestId('mobile-notifications-unread')).toBeVisible();
  await page.getByTestId('mobile-notifications-tab').click();
  await expect(page).toHaveURL(/\/notificaciones$/);
  await expect(page.getByText('Comprador QA', { exact: true })).toBeVisible();
  await expect(page.getByText('Hola, sigue disponible?', { exact: true })).toBeVisible();

  await page.getByText('Comprador QA', { exact: true }).click();
  await expect(page).toHaveURL(/\/mensajes\?conversation=77$/);
  await expect(page.getByRole('paragraph').filter({ hasText: 'Comprador QA' })).toBeVisible();
  await expect(page.getByTestId('mobile-notifications-unread')).toHaveCount(0);
});
