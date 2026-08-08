import { test, expect } from '@playwright/test';

test('home auto year quick filter opens a shareable motor result state', async ({ page }) => {
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

test('home auto price quick filter opens motor results with max price', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('home-auto-price-filter').selectOption('300000');

  await expect(page).toHaveURL(/category=motor/);
  const url = new URL(page.url());
  expect(url.searchParams.get('max_price')).toBe('300000');
});