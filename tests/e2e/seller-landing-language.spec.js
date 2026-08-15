import { expect, test } from '@playwright/test';

test.describe('seller campaign landing language', () => {
  test.use({ locale: 'ru-RU' });

  test('keeps Spanish campaign language while entering the publication flow', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'ru');
      localStorage.setItem('mercasto_language', 'ru');
    });

    const response = await page.goto('/vendedores', { waitUntil: 'domcontentloaded' });

    expect(response?.status(), '/vendedores HTTP status').toBeLessThan(400);
    await expect(page).toHaveURL(/\/post(?:[?#].*)?$/);
    await expect(page.locator('body')).toContainText('Inicia sesión para continuar');
    await expect(page.locator('html')).toHaveAttribute('lang', /^es(?:-MX)?$/);

    await expect.poll(() => page.evaluate(() => ({
      appLanguage: localStorage.getItem('lang'),
      detectedLanguage: localStorage.getItem('mercasto_language'),
    }))).toEqual({
      appLanguage: 'es',
      detectedLanguage: 'es',
    });
  });
});
