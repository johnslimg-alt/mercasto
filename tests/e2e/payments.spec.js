import crypto from 'node:crypto';
import { expect, test } from '@playwright/test';

const ISOLATED_STACK = process.env.E2E_ISOLATED_STACK === '1';
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:18000/api';
const E2E_SELLER_EMAIL = process.env.E2E_SELLER_EMAIL || 'seller_e2e@mercasto.com';
const E2E_SELLER_PASSWORD = process.env.E2E_SELLER_PASSWORD || 'E2eTestPass99!';
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin_e2e@mercasto.com';
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'E2eTestPass99!';
const CLIP_WEBHOOK_SECRET = process.env.CLIP_WEBHOOK_SECRET || 'test-webhook-secret';

const getModal = (page) => page
  .locator('.fixed.inset-0')
  .filter({ has: page.locator('input[name="email"], input[name="code"]') })
  .first();

async function loginUser(page, email, password) {
  const userButton = page
    .locator('.header-user-button, .mobile-account-button')
    .filter({ visible: true })
    .first();
  await expect(userButton).toBeVisible();
  await userButton.click();

  const modal = getModal(page);
  await expect(modal).toBeVisible({ timeout: 5000 });
  await modal.locator('input[name="email"]').fill(email);
  await modal.locator('input[name="password"]').fill(password);
  await modal.locator('input[name="password"]').press('Enter');
  await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 });

  const skipButton = page.getByRole('button', { name: /Omitir|Skip/i }).first();
  await skipButton.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
  }
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

  test('renders billing history and the current pricing catalog', async ({ page }) => {
    await loginUser(page, E2E_SELLER_EMAIL, E2E_SELLER_PASSWORD);
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
    await loginUser(page, E2E_SELLER_EMAIL, E2E_SELLER_PASSWORD);
    const token = await authToken(page);
    const pricingModal = await openPricing(page);
    const mobileProject = testInfo.project.name.includes('mobile');
    const plan = mobileProject
      ? { heading: /Negocio|Business/i, amount: 249, code: 'package_negocio' }
      : { heading: /Impulso|Boost/i, amount: 99, code: 'package_impulso' };

    const planCard = pricingModal.getByRole('heading', { name: plan.heading }).locator('..');
    await expect(planCard).toBeVisible();
    await planCard.getByRole('button', { name: /Adquirir plan|Get plan/i }).click();

    await page.waitForURL(/^http:\/\/127\.0\.0\.1:18001\/checkout\/local-checkout-/, { timeout: 15000 });
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
    const signature = crypto
      .createHmac('sha256', CLIP_WEBHOOK_SECRET)
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

  test('exposes payment audit and recovery tools only to an admin', async ({ page }) => {
    await loginUser(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
    await page.goto('/admin');
    await expect(page.locator('body')).toContainText(/Administración|Panel de Admin/i);
    await page.getByRole('button', { name: /Pagos|Payments/i }).first().click();
    await expect(page.locator('body')).toContainText(/Auditoría de Pagos|Payments Audit/i);
  });
});
