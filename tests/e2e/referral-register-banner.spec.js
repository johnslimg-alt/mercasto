import { expect, test } from '@playwright/test';

const referralCode = process.env.E2E_REFERRAL_CODE || 'E2ESELLER';

test.describe('referral registration banner', () => {
  test('desktop registration flow preserves the ref query and shows referral context', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop-only referral banner smoke.');

    await page.goto(`/?ref=${encodeURIComponent(referralCode)}`, { waitUntil: 'domcontentloaded' });

    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem('pendingReferral')))
      .toBe(referralCode);

    await page.getByRole('button', { name: /registr/i }).first().click();

    await expect(page.locator('body')).toContainText(/Crear cuenta|Registr/i);
    await expect(page.locator('body')).toContainText(new RegExp(referralCode, 'i'));
    await expect(page.locator('body')).not.toContainText(/Whoops|Stack trace|SQLSTATE|Exception/i);
  });
});
