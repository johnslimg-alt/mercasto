import { expect, test } from '@playwright/test';

const baseUrl = process.env.BASE_URL || 'https://mercasto.com';

test.describe('SMS launch mode', () => {
  test('disabled provider is not offered as a login method', async ({ page, request }) => {
    const response = await request.get(`${baseUrl}/api/auth/providers`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const providers = payload.providers ?? payload;
    const rawSms = providers?.sms;
    const smsEnabled = typeof rawSms === 'object' ? rawSms?.enabled === true : rawSms === true;
    test.skip(smsEnabled, 'SMS provider is enabled; use the enabled launch contract.');

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Teléfono (SMS)' })).toHaveCount(0);
    await expect(page.getByText(/La autenticación por SMS no está disponible/i)).toHaveCount(0);
  });
});
