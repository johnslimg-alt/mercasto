import { test, expect } from '@playwright/test';

for (const language of ['es', 'en', 'ar']) {
  test(`first category stays visible in ${language}`, async ({ page }) => {
    await page.addInitScript((lang) => {
      localStorage.setItem('lang', lang);
      localStorage.setItem('mercasto_language', lang);
    }, language);
    await page.goto('/');

    const rail = page.getByTestId('home-category-rail');
    const autos = page.getByTestId('home-category-motor');
    await expect(rail).toBeVisible();
    await expect(autos).toBeVisible();

    const position = await page.evaluate(() => {
      const railElement = document.querySelector('[data-testid="home-category-rail"]');
      const autosElement = document.querySelector('[data-testid="home-category-motor"]');
      const railRect = railElement.getBoundingClientRect();
      const autosRect = autosElement.getBoundingClientRect();
      return {
        railLeft: railRect.left,
        railRight: railRect.right,
        autosLeft: autosRect.left,
        autosRight: autosRect.right,
        pageWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(position.autosLeft).toBeGreaterThanOrEqual(position.railLeft - 1);
    expect(position.autosRight).toBeLessThanOrEqual(position.railRight + 1);
    expect(position.scrollWidth).toBeLessThanOrEqual(position.pageWidth + 2);
  });
}
