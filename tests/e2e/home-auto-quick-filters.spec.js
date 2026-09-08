import { test, expect } from '@playwright/test';

test('home auto year quick filter opens a shareable motor result state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const year = String(new Date().getFullYear());
  await page.goto('/');
  await page.getByTestId('home-auto-year-filter').selectOption(year);

  await expect(page).toHaveURL(new RegExp(`category=motor`));
  const url = new URL(page.url());
  expect(url.searchParams.get('filters[year][min]')).toBe(year);
  expect(url.searchParams.get('filters[year][max]')).toBe(year);

  await page.reload();
  await expect(page.locator('[data-catalog-screen]')).toBeVisible();
  const yearInputs = await page.locator('input[type="number"]').evaluateAll(nodes => nodes.map(node => node.value));
  expect(yearInputs.filter(value => value === year).length).toBeGreaterThanOrEqual(2);
});

test('home auto price quick filter opens motor results with max price', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/');
  await page.getByTestId('home-auto-price-filter').selectOption('300000');

  await expect(page).toHaveURL(/category=motor/);
  const url = new URL(page.url());
  expect(url.searchParams.get('max_price')).toBe('300000');
});

test('home automotive quick filters stay reachable without document overflow on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
  });

  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const row = page.getByTestId('home-auto-filter-row');
    await expect(row).toBeVisible();
    const toyota = row.getByRole('button', { name: 'Toyota', exact: true });
    await expect(toyota).toBeVisible();
    await toyota.scrollIntoViewIfNeeded();
    const [rowBox, toyotaBox] = await Promise.all([row.boundingBox(), toyota.boundingBox()]);
    expect(rowBox).not.toBeNull();
    expect(toyotaBox).not.toBeNull();
    expect(toyotaBox.x).toBeGreaterThanOrEqual(rowBox.x - 1);
    expect(toyotaBox.x + toyotaBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
    const geometry = await row.evaluate(node => ({
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
      overflowX: getComputedStyle(node).overflowX,
    }));
    expect(['auto', 'scroll']).toContain(geometry.overflowX);
    expect(geometry.scrollWidth).toBeGreaterThanOrEqual(geometry.clientWidth);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `document overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});
