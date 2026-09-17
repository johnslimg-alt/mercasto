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
    await expect(page).toHaveURL(/\/vendedores(?:[?#].*)?$/);
    await expect(page.locator('body')).toContainText('El plan gratuito incluye hasta 3 anuncios al mes');
    await expect(page.locator('html')).toHaveAttribute('lang', /^es(?:-MX)?$/);

    await page.getByRole('button', { name: 'Empezar gratis' }).first().click();
    await expect(page).toHaveURL(/\/post(?:[?#].*)?$/);
    await expect(page.locator('body')).toContainText('Inicia sesión para continuar');

    await expect.poll(() => page.evaluate(() => ({
      appLanguage: localStorage.getItem('lang'),
      detectedLanguage: localStorage.getItem('mercasto_language'),
    }))).toEqual({
      appLanguage: 'es',
      detectedLanguage: 'es',
    });
  });

  test('uses the shared Golden shell without changing the seller campaign flow', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.setItem('cookiesAccepted', 'true');
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/vendedores', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('golden-header')).toBeVisible();
    await expect(page.getByTestId('golden-seller-acquisition-main')).toBeVisible();
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.getByTestId('golden-bottom-nav')).toBeVisible();
    await expect(page.locator('.mobile-tabbar')).toBeHidden();

    const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await page.getByTestId('golden-theme-toggle').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!before);
    await page.getByTestId('golden-theme-toggle').click();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByRole('button', { name: 'Empezar gratis' }).first().click();
    await expect(page).toHaveURL(/\/post(?:[?#].*)?$/);
  });

});
