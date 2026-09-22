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
      const tabbar = page.getByTestId('golden-bottom-nav');
      await expect(form).toBeVisible();
      await expect(bar).toBeVisible();

      const controlHeights = await form.locator(':scope > *').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      expect(controlHeights.every(height => height >= 48)).toBeTruthy();
      const subsectionHeights = await page.getByTestId('vertical-hero-subsection').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      expect(subsectionHeights.length).toBeGreaterThan(0);
      expect(subsectionHeights.every(height => height >= 48)).toBeTruthy();

      const [barBox, tabBox] = await Promise.all([bar.boundingBox(), tabbar.boundingBox()]);
      expect(barBox.y + barBox.height).toBeLessThanOrEqual(tabBox.y + 1);

      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForTimeout(50);
      const geometry = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="golden-header"]').getBoundingClientRect();
        const filters = document.querySelector('.vertical-quick-filters').getBoundingClientRect();
        const tabs = document.querySelector('[data-testid="golden-bottom-nav"]').getBoundingClientRect();
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

test('mobile vertical hero utility pills stay on one line', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await page.addInitScript(() => {
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
  });
  await page.setViewportSize({ width: 390, height: 667 });

  for (const route of ['/motor', '/inmuebles', '/empleos']) {
    await page.goto(route);
    const form = page.getByTestId('vertical-hero-search-form');
    await expect(form).toBeVisible();
    const utility = form.locator('xpath=following-sibling::div[1]');
    const directItems = utility.locator(':scope > button, :scope > span');
    await expect(directItems.first()).toBeVisible();
    const styles = await directItems.evaluateAll(nodes => nodes.map(node => ({
      whiteSpace: getComputedStyle(node).whiteSpace,
      flexShrink: getComputedStyle(node).flexShrink,
    })));
    expect(styles.every(style => style.whiteSpace === 'nowrap' && style.flexShrink === '0')).toBeTruthy();
  }
});

test('mobile overlapping landing cards do not cover vertical hero controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await page.addInitScript(() => localStorage.setItem('cookie_consent', 'essential'));
  await page.setViewportSize({ width: 390, height: 667 });

  for (const route of ['/productos', '/turismo']) {
    await page.goto(route);
    const form = page.getByTestId('vertical-hero-search-form');
    await expect(form).toBeVisible();
    const geometry = await form.evaluate(element => {
      const hero = element.closest('.relative');
      const utility = element.nextElementSibling.getBoundingClientRect();
      const next = hero.nextElementSibling.getBoundingClientRect();
      return { utilityBottom: utility.bottom, nextTop: next.top };
    });
    expect(geometry.nextTop).toBeGreaterThanOrEqual(geometry.utilityBottom);
  }
});

test('vertical Golden header stays pinned directly above sticky quick filters', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');

  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/motor', '/inmuebles', '/empleos']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForTimeout(80);

      const geometry = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="golden-header"]');
        const filters = document.querySelector('.vertical-quick-filters');
        const headerRect = header.getBoundingClientRect();
        const filterRect = filters.getBoundingClientRect();
        return {
          headerPosition: getComputedStyle(header).position,
          headerTop: headerRect.top,
          headerBottom: headerRect.bottom,
          filterTop: filterRect.top,
        };
      });

      expect(geometry.headerPosition, `${route} header position at ${width}px`).toBe('sticky');
      expect(Math.abs(geometry.headerTop), `${route} header top at ${width}px`).toBeLessThanOrEqual(1);
      expect(geometry.filterTop, `${route} filter top at ${width}px`).toBeGreaterThanOrEqual(geometry.headerBottom - 1);
      expect(geometry.filterTop, `${route} filter gap at ${width}px`).toBeLessThanOrEqual(geometry.headerBottom + 2);
    }
  }
});

test('Golden public header fits a 320px viewport without clipping controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/motor', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('golden-theme-toggle')).toBeVisible();
  await expect(page.getByTestId('golden-location-button')).toBeVisible();
  await expect(page.getByTestId('golden-language-select')).toBeVisible();

  const geometry = await page.getByTestId('golden-header').evaluate(header => {
    const viewportWidth = document.documentElement.clientWidth;
    const visibleChildren = [...header.children]
      .filter(node => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map(node => {
        const rect = node.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      });
    return {
      viewportWidth,
      documentOverflow: document.documentElement.scrollWidth - viewportWidth,
      visibleChildren,
    };
  });

  expect(geometry.documentOverflow).toBeLessThanOrEqual(1);
  for (const child of geometry.visibleChildren) {
    expect(child.left).toBeGreaterThanOrEqual(-1);
    expect(child.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  }
});

test('tablet footer legal controls remain reachable above the fixed Golden nav', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.setViewportSize({ width: 768, height: 844 });
  await page.goto('/motor', { waitUntil: 'domcontentloaded' });
  const legal = page.locator('.app-footer-legal');
  const tabbar = page.getByTestId('golden-bottom-nav');
  await expect(legal).toBeVisible();
  await expect(tabbar).toBeVisible();

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect.poll(() => page.evaluate(() => {
    const legalNode = document.querySelector('.app-footer-legal');
    const navNode = document.querySelector('[data-testid="golden-bottom-nav"]');
    if (!legalNode || !navNode) return false;
    const legalRect = legalNode.getBoundingClientRect();
    const navRect = navNode.getBoundingClientRect();
    return legalRect.top >= 0 && legalRect.bottom <= navRect.top + 1;
  })).toBeTruthy();
});

test('dark vertical accents preserve readable light chips and CTA buttons', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('cookiesAccepted', 'true');
  });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('/motor', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('golden-autos-main')).toBeVisible({ timeout: 25_000 });
  const chip = page.getByTestId('vertical-hero-subsection').first();
  await expect(chip).toBeVisible();
  const chipColors = await chip.evaluate(element => {
    const label = element.querySelector('.mcg-hero-subsection-label');
    return {
      labelColor: getComputedStyle(label).color,
      backgroundImage: getComputedStyle(element).backgroundImage,
    };
  });
  expect(chipColors.labelColor).toBe('rgb(15, 23, 42)');
  expect(chipColors.backgroundImage).toContain('rgb(255, 255, 255)');

  for (const route of ['/inmuebles', '/empleos', '/servicios', '/electronica']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mcg-vertical-page')).toBeVisible({ timeout: 25_000 });
    const control = page.locator('.mcg-preserve-white-accent').first();
    await expect(control).toBeVisible();
    const colors = await control.evaluate(element => {
      const parse = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = (rgb) => {
        const channels = rgb.map(value => {
          const channel = value / 255;
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
      };
      const style = getComputedStyle(element);
      const foreground = parse(style.color);
      const background = parse(style.backgroundColor);
      const lighter = Math.max(luminance(foreground), luminance(background));
      const darker = Math.min(luminance(foreground), luminance(background));
      return {
        backgroundColor: style.backgroundColor,
        contrast: (lighter + 0.05) / (darker + 0.05),
      };
    });
    expect(colors.backgroundColor, `${route} CTA background`).toBe('rgb(255, 255, 255)');
    expect(colors.contrast, `${route} CTA contrast`).toBeGreaterThanOrEqual(4.5);
  }
});
