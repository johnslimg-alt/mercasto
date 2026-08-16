import { expect, test } from '@playwright/test';

const user = { id: 91, name: 'QA User', role: 'individual', is_verified: true, account_verified: true };
const notification = { id: 17, type: 'price_drop', is_read: 0, created_at: '2026-08-08T08:15:00Z', data: { ad_title: 'Toyota Corolla', old_price: 325000, new_price: 299500 } };
const conversation = { conversation_id: 31, ad_id: 9, user_id: 22, name: 'QA Seller', unread_count: 1, last_message: 'Hola', created_at: '2026-08-15T10:00:00Z', ad: { id: 9, title: 'QA Listing' } };

async function installSession(page) {
  await page.addInitScript(({ savedUser }) => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'communications-control-token');
    localStorage.setItem('user', JSON.stringify(savedUser));
  }, { savedUser: user });
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/user') && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    if (path.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (path.endsWith('/categories')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path.endsWith('/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [notification], next_page_url: null }) });
    if (path.endsWith('/chat/conversations')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([conversation]) });
    if (path.endsWith('/chat/conversations/31/messages')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversation, messages: [{ id: 51, conversation_id: 31, sender_id: 22, body: 'Hola', created_at: '2026-08-15T10:00:00Z' }] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expectNamedVisibleControls(page, surface) {
  const unnamed = await page.locator('button:visible, a[href]:visible, input:visible, select:visible, textarea:visible').evaluateAll(nodes => nodes.flatMap(node => {
    const tag = node.tagName.toLowerCase();
    const id = node.id || '';
    const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText?.trim() || '' : '';
    const wrappingLabel = node.closest('label')?.innerText?.trim() || '';
    const nativeTextName = tag === 'button' || tag === 'a' ? (node.innerText || '').trim() : '';
    const named = nativeTextName || (node.getAttribute('aria-label') || '').trim() || (node.getAttribute('aria-labelledby') || '').trim() || (node.getAttribute('title') || '').trim() || explicitLabel || wrappingLabel;
    if (named || node.getAttribute('type') === 'hidden') return [];
    return [{ tag, type: node.getAttribute('type') || '', placeholder: node.getAttribute('placeholder') || '', html: node.outerHTML.slice(0, 320) }];
  }));
  expect(unnamed, `unnamed ${surface} controls: ${JSON.stringify(unnamed, null, 2)}`).toEqual([]);
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`notifications and chat controls expose accessible names on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installSession(page);
    await mockApi(page);
    await page.goto('/notificaciones', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Toyota Corolla', { exact: false })).toBeVisible();
    await expectNamedVisibleControls(page, 'notifications');
    await page.goto('/mensajes?conversation=31', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('section').getByText('QA Seller', { exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Escribe un mensaje' })).toBeVisible();
    await expectNamedVisibleControls(page, 'chat');
  });
}
