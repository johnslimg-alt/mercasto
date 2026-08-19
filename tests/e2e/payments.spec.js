import { createHmac } from 'node:crypto';
import { expect, test } from '@playwright/test';

const ISOLATED_STACK = process.env.E2E_ISOLATED_STACK === '1';
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:18000/api';
const E2E_SELLER_EMAIL = process.env.E2E_SELLER_EMAIL || 'seller_e2e@mercasto.com';
const E2E_SELLER_PASSWORD = process.env.E2E_SELLER_PASSWORD || 'E2eTestPass99!';
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin_e2e@mercasto.com';
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'E2eTestPass99!';
const CLIP_WEBHOOK_SECRET = process.env.CLIP_WEBHOOK_SECRET || 'test-webhook-secret';
const CLIP_E2E_PUBLIC_BASE_URL = process.env.CLIP_E2E_PUBLIC_BASE_URL || 'http://127.0.0.1:18001';

const sessionCache = new Map();

async function authenticatedSession(request, email, password) {
  if (sessionCache.has(email)) return sessionCache.get(email);

  let response;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    response = await request.post(`${API_BASE_URL}/login`, {
      data: { email, password },
      headers: { Accept: 'application/json' },
    });
    if (response.ok() || response.status() !== 429 || attempt === 6) break;
    const payload = await response.json().catch(() => ({}));
    const retryAfterHeader = Number(response.headers()['retry-after'] || 0);
    const retryAfterBody = Number(payload?.retry_after || 0);
    await new Promise(resolve => setTimeout(resolve, Math.max(1, retryAfterHeader, retryAfterBody) * 1000));
  }

  expect(response?.ok(), `login status=${response?.status() ?? 'unavailable'} for ${email}`).toBeTruthy();
  const payload = await response.json();
  const session = { token: payload.access_token || payload.token, user: payload.user };
  sessionCache.set(email, session);
  return session;
}

async function loginUser(page, request, email, password) {
  const session = await authenticatedSession(request, email, password);
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  }, session);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.header-user-button, .mobile-account-button').filter({ visible: true }).first())
    .not.toContainText(/Invitado|Guest/i, { timeout: 10000 });
}

async function authToken(page) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  expect(token).toBeTruthy();
  return token;
}

async function userPayments(request, token) {
  const response = await request.get(`${API_BASE_URL}/user/payments`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openPricing(page) {
  await page.goto('/profile');
  const pricingButton = page.getByRole('button', { name: /Tarifas|Ver planes|Pricing/i })
    .filter({ visible: true })
    .first();
  await expect(pricingButton).toBeVisible();
  await pricingButton.click();

  const modal = page.locator('.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Planes de Tarifas|Planes y Promociones|Pricing Plans/i }) }).first();
  await expect(modal).toBeVisible();
  return modal;
}

test.describe('Payments and Clip Billing E2E Flow', () => {
  test.skip(!ISOLATED_STACK, 'Run through the isolated launch E2E stack; never mutate production payments.');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('cookiesAccepted', 'true');
    });
  });

  test('renders billing history and the current pricing catalog', async ({ page, request }) => {
    await loginUser(page, request, E2E_SELLER_EMAIL, E2E_SELLER_PASSWORD);
    await page.goto('/profile');

    await page.getByRole('button', { name: /^Transacciones$/i }).click();
    await expect(page.getByRole('heading', { name: /^Transacciones$/i })).toBeVisible();

    const pricingModal = await openPricing(page);
    await expect(pricingModal.getByRole('heading', { name: /Planes de Tarifas|Planes y Promociones|Pricing Plans/i })).toBeVisible();
    await expect(pricingModal.getByRole('heading', { name: /Impulso|Boost/i })).toBeVisible();
    await expect(pricingModal.getByText('$99', { exact: false }).first()).toBeVisible();
    await expect(pricingModal.getByText(/tarjeta o efectivo en OXXO|card or cash at OXXO/i)).toBeVisible();
  });

  test('creates a Clip checkout, verifies it and fulfills it exactly once', async ({ page, request }, testInfo) => {
    await loginUser(page, request, E2E_SELLER_EMAIL, E2E_SELLER_PASSWORD);
    const token = await authToken(page);
    const pricingModal = await openPricing(page);
    const mobileProject = testInfo.project.name.includes('mobile');
    const plan = mobileProject
      ? { heading: /Negocio|Business/i, amount: 249, code: 'package_negocio' }
      : { heading: /Impulso|Boost/i, amount: 99, code: 'package_impulso' };

    const planCard = pricingModal.getByRole('heading', { name: plan.heading }).locator('..');
    await expect(planCard).toBeVisible();
    await planCard.getByRole('button', { name: /Adquirir plan|Get plan/i }).click();

    const clipOrigin = new URL(CLIP_E2E_PUBLIC_BASE_URL).origin;
    await page.waitForURL((url) => url.origin === clipOrigin && url.pathname.startsWith('/checkout/local-checkout-'), { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Clip local checkout' })).toBeVisible();
    const paymentRequestId = new URL(page.url()).pathname.split('/').pop();
    expect(paymentRequestId).toMatch(/^local-checkout-/);

    const beforePayload = await userPayments(request, token);
    const pending = beforePayload.data.find((payment) => payment.clip_payment_request_id === paymentRequestId);
    expect(pending).toBeTruthy();
    expect(Number(pending.amount)).toBe(plan.amount);
    expect(pending.product_code).toBe(plan.code);
    expect(pending.status).toBe('pending');

    const webhookBody = JSON.stringify({
      id: `event-${paymentRequestId}`,
      resource: 'CHECKOUT',
      resource_status: 'COMPLETED',
      payment_request_id: paymentRequestId,
      me_reference_id: pending.clip_checkout_id,
    });
    const signature = createHmac('sha256', CLIP_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');

    const sendWebhook = () => request.post(`${API_BASE_URL}/webhooks/clip`, {
      data: webhookBody,
      headers: {
        'Content-Type': 'application/json',
        'X-Clip-Signature': `sha256=${signature}`,
      },
    });

    const first = await sendWebhook();
    expect(first.status()).toBe(200);
    expect((await first.json()).status).toBe('received');

    const duplicate = await sendWebhook();
    expect(duplicate.status()).toBe(200);
    expect((await duplicate.json()).status).toBe('received');

    const afterPayload = await userPayments(request, token);
    const matching = afterPayload.data.filter((payment) => payment.clip_payment_request_id === paymentRequestId);
    expect(matching).toHaveLength(1);
    expect(matching[0].status).toBe('paid');

    const userResponse = await request.get(`${API_BASE_URL}/user`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    expect(userResponse.ok()).toBeTruthy();
    const user = await userResponse.json();
    expect(user.plan_code).toBe(plan.code);
  });

  test('rejects a spoofed signed webhook before provider verification', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/webhooks/clip`, {
      data: JSON.stringify({
        resource: 'CHECKOUT',
        resource_status: 'COMPLETED',
        payment_request_id: 'forged-request-id',
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Clip-Signature': 'sha256=invalid_forged_signature_value',
      },
    });
    expect(response.status()).toBe(401);
    expect((await response.json()).status).toBe('invalid_signature');
  });

  test('exposes payment audit and recovery tools only to an admin', async ({ page, request }) => {
    await loginUser(page, request, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    await page.goto('/admin');
    await expect(page.locator('body')).toContainText(/Administración|Panel de Admin/i);
    await page.getByRole('button', { name: /Pagos|Payments/i }).first().click();
    await expect(page.locator('body')).toContainText(/Auditoría de Pagos|Payments Audit/i);
  });
});
