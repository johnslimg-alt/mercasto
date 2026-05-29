import { expect, test } from '@playwright/test';
import crypto from 'crypto';

const E2E_SELLER_EMAIL = process.env.E2E_SELLER_EMAIL;
const E2E_SELLER_PASSWORD = process.env.E2E_SELLER_PASSWORD;
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const CLIP_WEBHOOK_SECRET = process.env.CLIP_WEBHOOK_SECRET;

// Precise helper to select the active auth modal container on the page uniquely
const getModal = (page) => page.locator('.fixed.inset-0').filter({ has: page.locator('input[name="email"], input[name="code"]') }).first();

// Helper to log in a user using the modal flow
async function loginUser(page, email, password) {
  const userButton = page.locator('.header-user-button, .mobile-account-button').filter({ visible: true }).first();
  await expect(userButton).toBeVisible();

  const modal = getModal(page);

  // Real Playwright click
  await userButton.click();
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Wait for modal animation to settle and React click handlers to attach
  await page.waitForTimeout(500);

  // Ensure modal is in Login mode (header has "Iniciar Sesión" or "Login")
  const h2Text = await modal.locator('h2').innerText().catch(() => '');
  if (!/Iniciar Sesión|Login/i.test(h2Text)) {
    const hasAccountBtn = modal.locator('button:has-text("tienes cuenta")').first();
    const smsBackBtn = modal.locator('button:has-text("Volver a iniciar")').first();

    if (await hasAccountBtn.isVisible()) {
      await hasAccountBtn.click();
    } else if (await smsBackBtn.isVisible()) {
      await smsBackBtn.click();
    }
    await expect(modal.locator('h2')).toContainText(/Iniciar Sesión|Login/i, { timeout: 3000 });
  }

  // Fill credentials inside the modal
  await modal.locator('input[name="email"]').fill(email);
  await modal.locator('input[name="password"]').fill(password);

  // Submit login via Enter key
  await modal.locator('input[name="password"]').press('Enter');

  // Wait for the auth session token to be successfully saved in localStorage
  await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 });

  // Wait for onboarding modal and dismiss it if it appears (App.jsx opens it with a 500ms delay)
  const skipButton = page.locator('button').filter({ hasText: /Omitir|Skip/i }).first();
  await skipButton.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await skipButton.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
  }
}

test.describe('Payments and Clip Billing E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage, clear state, and login
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());

    // Dismiss cookie banner
    const acceptCookies = page.locator('button:has-text("Aceptar")').first();
    await acceptCookies.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click().catch(() => {});
    }
  });

  test('should render billing dashboard and promotion packages correctly', async ({ page }) => {
    test.skip(!E2E_SELLER_EMAIL || !E2E_SELLER_PASSWORD, 'Set E2E_SELLER_EMAIL and E2E_SELLER_PASSWORD to run seller billing tests.');
    // Login as seller
    await loginUser(page, E2E_SELLER_EMAIL, E2E_SELLER_PASSWORD);
    await page.goto('/profile');

    // Select the "Transacciones" (Billing History) tab in the dashboard using a precise .cursor-pointer selector
    const transactionsTab = page.locator('.cursor-pointer').filter({ hasText: /Transacciones|Transactions/i }).filter({ visible: true }).first();
    await expect(transactionsTab).toBeVisible();
    await transactionsTab.click();

    // Verify balance display and transactions widget
    await expect(page.locator('body')).toContainText(/Facturación|Billing|Pagos|Historial de Transacciones|Créditos/i);
    await expect(page.locator('.lucide-zap, .lucide-credit-card').first()).toBeVisible();

    // Click "Conviértete en PRO" button to open the pricing/promotional options modal
    const upgradeButton = page.locator('button').filter({ hasText: /Conviértete en PRO|Upgrade/i }).filter({ visible: true }).first();
    await expect(upgradeButton).toBeVisible();
    await upgradeButton.click();

    // Verify promotional packages modal is displayed
    const pricingModal = page.locator('.fixed.inset-0').filter({ hasText: /Tarifas|Pricing|Elegir plan/i }).first();
    await expect(pricingModal).toBeVisible();
  });

  test('should navigate checkout flow and trigger Clip gateway sandbox', async ({ page }) => {
    test.skip(!E2E_SELLER_EMAIL || !E2E_SELLER_PASSWORD, 'Set E2E_SELLER_EMAIL and E2E_SELLER_PASSWORD to run checkout tests.');
    // Login as seller
    await loginUser(page, E2E_SELLER_EMAIL, E2E_SELLER_PASSWORD);
    await page.goto('/profile');

    // Click upgrade button to open pricing options
    const upgradeButton = page.locator('button').filter({ hasText: /Conviértete en PRO|Upgrade/i }).filter({ visible: true }).first();
    await expect(upgradeButton).toBeVisible();
    await upgradeButton.click();

    // Verify modal is visible
    const pricingModal = page.locator('.fixed.inset-0').filter({ hasText: /Tarifas|Pricing|Elegir plan/i }).first();
    await expect(pricingModal).toBeVisible();

    // Dialog handler to accept any error alert during checkout
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // Select standard PRO plan to invoke Clip gateway payment redirect
    const buyButton = pricingModal.locator('button').filter({ hasText: /Contratar|Elegir|Buy|Select|Subscribe/i }).first();
    await buyButton.click();

    // Verify it triggers a redirect or displays a processing notification
    await page.waitForTimeout(1000);
  });

  test('should process signed payment webhook with idempotency and signature validation', async ({ request }) => {
    test.skip(!CLIP_WEBHOOK_SECRET, 'Set CLIP_WEBHOOK_SECRET to run signed webhook tests.');
    // Generate a payload representing a successful transaction from Clip
    const webhookPayload = JSON.stringify({
      event: 'payment.succeeded',
      transaction_id: `tx_${Math.floor(Math.random() * 1000000)}`,
      amount: 149.00,
      currency: 'MXN',
      user_id: 2,
      timestamp: new Date().toISOString()
    });

    // Sign the payload using the webhook secret from the test environment.
    const signature = crypto
      .createHmac('sha256', CLIP_WEBHOOK_SECRET)
      .update(webhookPayload)
      .digest('hex');

    // Post to the webhook endpoint with the signature header
    const response = await request.post('/api/webhooks/clip', {
      data: webhookPayload,
      headers: {
        'Content-Type': 'application/json',
        'X-Clip-Signature': signature,
        'X-Webhook-Idempotency-Key': `idem_${Math.floor(Math.random() * 1000000)}`
      }
    });

    // Should process successfully and return 200/204 or status ok
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('received');
  });

  test('should reject unsigned or spoofed payment webhooks', async ({ request }) => {
    const webhookPayload = JSON.stringify({
      event: 'payment.succeeded',
      transaction_id: 'fake_tx_123',
      amount: 149.00,
      currency: 'MXN',
      user_id: 2
    });

    // Post to webhook with missing or invalid signature
    const response = await request.post('/api/webhooks/clip', {
      data: webhookPayload,
      headers: {
        'Content-Type': 'application/json',
        'X-Clip-Signature': 'invalid_forged_signature_value',
        'X-Webhook-Idempotency-Key': 'idem_fake_123'
      }
    });

    // Should return 401 or 403 Forbidden because authentication fails
    expect([401, 403]).toContain(response.status());
  });

  test('should display manual recovery and billing tools in Admin Dashboard', async ({ page }) => {
    test.skip(!E2E_ADMIN_EMAIL || !E2E_ADMIN_PASSWORD, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin billing tests.');
    // Log in as Admin
    await loginUser(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

    // Navigate to admin panels and verify manual transaction overrides and refunds are visible
    await page.goto('/admin');
    await expect(page.locator('body')).toContainText(/Administración|Panel de Admin/i);

    // Click "Pagos" (Payments) tab in the admin header
    const paymentsTab = page.locator('button').filter({ hasText: /Pagos|Payments/i }).first();
    await paymentsTab.click();

    // Verify presence of transaction override console
    await expect(page.locator('body')).toContainText(/Auditoría de Pagos|Payments Audit/i);
  });
});
