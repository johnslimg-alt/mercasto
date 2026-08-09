import { expect, test } from '@playwright/test';

const currentUser = {
  id: 101,
  name: 'Comprador E2E',
  email: 'buyer-chat@example.com',
  role: 'individual',
  account_verified: true,
  email_verified_at: '2026-08-01T00:00:00Z',
};

const seller = {
  id: 202,
  name: 'Vendedor E2E',
  avatar_url: null,
};

test.describe('marketplace internal chat', () => {
  test('starts a listing conversation and keeps the message after server creation', async ({ page }) => {
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });

    let sentPayload = null;
    let created = false;

    await page.addInitScript((user) => {
      localStorage.setItem('auth_token', 'chat-e2e-token');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('cookiesAccepted', 'true');
    }, currentUser);

    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;

      if (path === '/api/user' && request.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentUser) });
      }

      if (path === '/api/chat/conversations' && request.method() === 'GET') {
        const conversations = created ? [{
          conversation_id: 77,
          user_id: seller.id,
          name: seller.name,
          avatar_url: null,
          ad_id: 42,
          ad: { id: 42, title: 'Bicicleta urbana', price: 3500, image_url: null },
          last_message: 'Sigue disponible?',
          created_at: '2026-08-03T20:00:00Z',
          unread_count: 0,
          is_read: true,
          sender_id: currentUser.id,
          status: 'active',
        }] : [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(conversations) });
      }

      if (path === '/api/chat/messages' && request.method() === 'POST') {
        sentPayload = request.postDataJSON();
        created = true;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 501,
            conversation_id: 77,
            sender_id: currentUser.id,
            receiver_id: seller.id,
            ad_id: 42,
            content: sentPayload.content,
            body: sentPayload.content,
            type: 'text',
            created_at: '2026-08-03T20:00:00Z',
            sender: currentUser,
          }),
        });
      }

      if (path === '/api/chat/conversations/77/messages' && request.method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            conversation: {
              conversation_id: 77,
              user_id: seller.id,
              name: seller.name,
              avatar_url: null,
              ad_id: 42,
              ad: { id: 42, title: 'Bicicleta urbana', price: 3500, image_url: null },
              unread_count: 0,
              is_read: true,
              status: 'active',
            },
            messages: [{
              id: 501,
              conversation_id: 77,
              sender_id: currentUser.id,
              receiver_id: seller.id,
              ad_id: 42,
              content: 'Sigue disponible?',
              body: 'Sigue disponible?',
              type: 'text',
              created_at: '2026-08-03T20:00:00Z',
              sender: currentUser,
            }],
          }),
        });
      }

      if (path === '/api/broadcasting/auth') {
        return route.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
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

    await page.goto('/mensajes?ad_id=42&seller_id=202&title=Bicicleta%20urbana', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByRole('heading', { name: 'Mensajes' }), browserErrors.join('\n')).toBeVisible();
    await expect(page.getByText('Bicicleta urbana').last()).toBeVisible();

    const composer = page.getByRole('textbox', { name: 'Escribe un mensaje' });
    await composer.fill('Sigue disponible?');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect.poll(() => sentPayload).toEqual({
      receiver_id: seller.id,
      ad_id: 42,
      content: 'Sigue disponible?',
    });
    await expect(page).toHaveURL(/\/mensajes\?conversation=77$/);
    await expect(page.getByText('Sigue disponible?').last()).toBeVisible();
    await expect(page.getByText(seller.name).last()).toBeVisible();
  });
});
