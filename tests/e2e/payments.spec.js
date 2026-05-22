import { expect, test } from '@playwright/test';
import crypto from 'crypto';

test.describe('Payments and Clip Billing E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate seller
    await page.goto('/login');
    await page.fill('input[type="email"]', 'seller@example.com');
    await page.fill('input[type="password"]', 'SellerPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/account**', { timeout: 10000 }).catch(() => {});
  });

  test('should render billing dashboard and promotion packages correctly', async ({ page }) => {
    await page.goto('/account/billing');

    // Verify balance and history widgets
    await expect(page.locator('h1')).toContainText(/Facturación|Billing|Pagos/i);
    await expect(page.locator('.balance-display, .current-balance')).toBeVisible();
    await expect(page.locator('.transactions-table, .payment-history')).toBeVisible();

    // Verify promotional packages options
    await page.goto('/account/promotions');
    await expect(page.locator('.promotion-package-card')).toHaveCount(3); // Basic, Featured, Premium
  });

  test('should navigate checkout flow and trigger Clip gateway sandbox', async ({ page }) => {
    await page.goto('/account/promotions');
    
    // Choose premium/featured package
    const chooseButton = page.locator('.promotion-package-card button:has-text("Adquirir"), .promotion-package-card button:has-text("Buy")').first();
    await chooseButton.click();

    // Should load Checkout checkout screen
    await page.waitForURL('**/checkout/**').catch(() => {});
    await expect(page.locator('h1')).toContainText(/Pasarela|Pago|Checkout|Clip/i);

    // Click pay button to invoke Clip payment redirect
    const payButton = page.locator('button:has-text("Pagar con Clip"), button:has-text("Pay now")');
    await expect(payButton).toBeVisible();
    await payButton.click();

    // Mock Clip payment screen redirect behavior
    await expect(page.locator('body')).toContainText(/Procesando con Clip|Redirecting to Clip/i);
  });

  test('should process signed payment webhook with idempotency and signature validation', async ({ request }) => {
    // Generate a payload representing a successful transaction from Clip
    const webhookPayload = JSON.stringify({
      event: 'payment.succeeded',
      transaction_id: `tx_${Math.floor(Math.random() * 1000000)}`,
      amount: 149.00,
      currency: 'MXN',
      user_id: 2,
      timestamp: new Date().toISOString()
    });

    // Sign the payload using a mock secret shared between the backend and Clip
    const mockSecret = 'clip_webhook_shared_signing_secret_key_123';
    const signature = crypto
      .createHmac('sha256', mockSecret)
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
    expect(body.status).toBe('success');
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
    // Log out current seller and login as Admin
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@mercasto.com');
    await page.fill('input[type="password"]', 'AdminPassSecret123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/account**', { timeout: 10000 }).catch(() => {});

    // Navigate to admin panels and verify manual transaction overrides and refunds are visible
    await page.goto('/account/admin');
    await expect(page.locator('h1')).toContainText(/Administración|Admin/i);

    // Verify presence of transaction override console
    await page.click('button:has-text("Transacciones"), button:has-text("Transactions")');
    await expect(page.locator('.admin-billing-override-table')).toBeVisible();

    // Verify refund button action triggers confirmation dialog
    const refundBtn = page.locator('.refund-override-btn').first();
    if (await refundBtn.isVisible()) {
      await refundBtn.click();
      await expect(page.locator('div[role="dialog"], .modal')).toBeVisible();
      await page.click('.modal button:has-text("Cancelar"), .modal button:has-text("Cancel")');
    }
  });
});
