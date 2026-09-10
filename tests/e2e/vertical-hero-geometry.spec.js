import { test, expect } from '@playwright/test';

test('vertical hero search controls stay inside the form from tablet through desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');

  for (const width of [768, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/motor');
    const form = page.getByTestId('vertical-hero-search-form');
    await expect(form).toBeVisible();

    const geometry = await form.evaluate(element => {
      const formRect = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        left: formRect.left,
        right: formRect.right,
        children: [...element.children].map(child => {
          const rect = child.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        }),
      };
    });

    expect(geometry.scrollWidth, `form scroll width at ${width}px`).toBeLessThanOrEqual(geometry.clientWidth + 1);
    for (const child of geometry.children) {
      expect(child.left, `child left edge at ${width}px`).toBeGreaterThanOrEqual(geometry.left - 1);
      expect(child.right, `child right edge at ${width}px`).toBeLessThanOrEqual(geometry.right + 1);
      expect(child.width, `child width at ${width}px`).toBeGreaterThan(0);
    }
  }
});

test('vertical hero fullscreen search-area can invoke the search handler without a synthetic form event', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/motor');

  const heroMapToggle = page.getByRole('button', { name: /Ver anuncios en el mapa/i });
  await expect(heroMapToggle).toBeVisible();
  await heroMapToggle.click();
  const expand = page.getByTestId('map-expand').first();
  await expect(expand).toBeVisible({ timeout: 15_000 });
  await expand.click();
  const dialog = page.getByRole('dialog', { name: 'Mapa interactivo' });
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('map-filter-toggle').click();
  await dialog.getByTestId('map-search-area').click();

  await expect(page).toHaveURL(/\?category=motor/);
  expect(pageErrors).toEqual([]);
});

test('mobile vertical quick filters stay reachable above the tabbar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await page.addInitScript(() => {
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
  });

  for (const viewport of [{ width: 390, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    for (const route of ['/motor', '/inmuebles', '/empleos']) {
      await page.goto(route);
      const form = page.getByTestId('vertical-hero-search-form');
      const bar = page.locator('.vertical-quick-filters');
      const rail = bar.locator(':scope > div');
      const tabbar = page.locator('.mobile-tabbar');
      await expect(form).toBeVisible();
      await expect(bar).toBeVisible();

      const controlHeights = await form.locator(':scope > *').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      expect(controlHeights.every(height => height >= 48)).toBeTruthy();

      if (viewport.height >= 844) {
        const [barBox, tabBox] = await Promise.all([bar.boundingBox(), tabbar.boundingBox()]);
        expect(barBox.y + barBox.height).toBeLessThanOrEqual(tabBox.y + 1);
      }

      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForTimeout(50);
      const geometry = await page.evaluate(() => {
        const header = document.querySelector('.site-header').getBoundingClientRect();
        const filters = document.querySelector('.vertical-quick-filters').getBoundingClientRect();
        const tabs = document.querySelector('.mobile-tabbar').getBoundingClientRect();
        const railElement = document.querySelector('.vertical-quick-filters > div');
        return {
          headerBottom: header.bottom,
          filterTop: filters.top,
          filterBottom: filters.bottom,
          tabTop: tabs.top,
          scrollbarWidth: getComputedStyle(railElement).scrollbarWidth,
        };
      });
      expect(geometry.filterTop).toBeGreaterThanOrEqual(geometry.headerBottom - 1);
      expect(geometry.filterBottom).toBeLessThanOrEqual(geometry.tabTop + 1);
      expect(geometry.scrollbarWidth).toBe('none');

      const buttons = rail.locator('button:visible');
      await expect(buttons.first()).toBeVisible();
      await buttons.first().click();
      await rail.evaluate(element => { element.scrollLeft = element.scrollWidth; });
      const last = buttons.last();
      await expect(last).toBeVisible();
      await last.click();
    }
  }
});
