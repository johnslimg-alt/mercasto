import { test, expect } from '@playwright/test';

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  });
  await page.goto('/');
  const card = page.getByTestId('home-real-estate-map-card');
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeVisible();
  await expect(page.getByTestId('map-expand').first()).toBeVisible({ timeout: 15_000 });
}

for (const project of ['chromium-desktop', 'chromium-mobile']) {
  test(`home map fullscreen and filters are reachable in ${project}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== project);
    await prepare(page);

    const expand = page.getByTestId('map-expand').first();
    const box = await expand.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48);
    await expand.click();

    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    const filterToggle = dialog.getByTestId('map-filter-toggle');
    const filterBox = await filterToggle.boundingBox();
    expect(filterBox?.height).toBeGreaterThanOrEqual(48);
    await filterToggle.click();
    await expect(dialog.getByTestId('map-filter-query')).toBeVisible();

    const close = dialog.getByTestId('map-close');
    const closeBox = await close.boundingBox();
    expect(closeBox?.height).toBeGreaterThanOrEqual(48);
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(expand).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
