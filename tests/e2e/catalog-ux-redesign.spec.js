import { expect, test } from '@playwright/test';

const ads = [
  {
    id: 91001,
    title: { es: 'Toyota Corolla compacto' },
    price: 285000,
    category: 'motor',
    condition: 'usado',
    state: 'Veracruz',
    location: 'Boca del Río, Veracruz',
    image_url: '/placeholder-ad.svg',
    latitude: 19.16,
    longitude: -96.10,
    user: { role: 'individual' },
  },
  {
    id: 91002,
    title: { es: 'Negocio listo para operar' },
    price: 640000,
    category: 'negocios',
    condition: 'nuevo',
    state: 'Veracruz',
    location: 'Veracruz, Veracruz',
    image_url: '/placeholder-ad.svg',
    latitude: 19.18,
    longitude: -96.13,
    user: { role: 'individual' },
  },
];

async function installSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    if (!sessionStorage.getItem('__catalog_view_test_seeded')) {
      localStorage.removeItem('mercasto_catalog_view');
      sessionStorage.setItem('__catalog_view_test_seeded', '1');
    }
  });
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/ads')) {
      const category = url.searchParams.get('category');
      const data = category ? ads.filter(ad => ad.category === category) : ads;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, total: data.length, current_page: 1, last_page: 1 }) });
    }
    if (url.pathname.endsWith('/category-attributes')) {
      const category = url.searchParams.get('category');
      const data = category === 'negocios'
        ? [{ id: 'tipo_negocio', label: 'Tipo de oportunidad', type: 'select', options: ['Traspaso', 'Franquicia'] }]
        : [];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    }
    if (url.pathname.endsWith('/categories')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (url.pathname.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (url.pathname.includes('/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test('catalog list mode is a compact horizontal list and persists across reload', async ({ page }) => {
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/listings?category=motor');
  await page.getByTestId('catalog-list-view').click();

  const card = page.getByTestId('catalog-list-card').first();
  await expect(card).toBeVisible();
  const cardBox = await card.boundingBox();
  const imageBox = await card.locator('img').first().boundingBox();
  expect(cardBox?.height).toBeLessThanOrEqual(125);
  expect(cardBox?.width).toBeGreaterThan(300);
  expect(imageBox?.width).toBeLessThanOrEqual(115);
  expect(imageBox?.height).toBeLessThanOrEqual(105);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mercasto_catalog_view'))).toBe('list');

  await page.reload();
  await expect(page.getByTestId('catalog-list-card').first()).toBeVisible();
});

test('catalog keeps permanent sidebar only on wide desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installSession(page);
  await mockApi(page);
  for (const width of [1024, 1180, 1279]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/listings?category=motor');
    await expect(page.getByTestId('sidebar-filters')).toBeHidden();
    const trigger = page.getByTestId('catalog-mobile-filters');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByTestId('catalog-tablet-filter-dialog')).toBeVisible();
    await page.getByTestId('catalog-tablet-filter-close').click();
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/listings?category=motor');
  await expect(page.getByTestId('sidebar-filters')).toBeVisible();
  await expect(page.getByTestId('catalog-mobile-filters')).toBeHidden();
  const sidebarBox = await page.getByTestId('sidebar-filters').boundingBox();
  expect(sidebarBox?.width).toBeLessThanOrEqual(290);
});

test('category quick links stay compact and aligned on mobile', async ({ page }) => {
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/negocios');
  const links = page.getByTestId('category-quick-link');
  await expect(links.first()).toBeVisible();
  const count = await links.count();
  expect(count).toBeGreaterThan(2);
  for (let index = 0; index < Math.min(count, 6); index += 1) {
    const box = await links.nth(index).boundingBox();
    expect(box?.height).toBeLessThanOrEqual(78);
    expect(box?.height).toBeGreaterThanOrEqual(60);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

// ---------------------------------------------------------------------------
// Catalog filter touch targets. Below the xl breakpoint the catalog filters are
// rendered inside a BottomSheet (< 768px) or a tablet drawer (768-1279px), so
// every interactive control must offer a 48px touch target. At >= 1280px the
// permanent sidebar keeps its original compact density.
// ---------------------------------------------------------------------------

const TOUCH_TARGET_MIN = 48;

async function expectMinTouchTarget(locator, label, minimum = TOUCH_TARGET_MIN) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} should have a bounding box`).not.toBeNull();
  expect(box.height, `${label} height`).toBeGreaterThanOrEqual(minimum);
  expect(box.width, `${label} width`).toBeGreaterThanOrEqual(minimum);
}

async function noHorizontalOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

// Scrollbar gutters are measured as offsetWidth minus borders minus clientWidth,
// so a hidden scrollbar yields 0 regardless of border or padding.
async function scrollbarGutters(dialog) {
  return dialog.evaluate((root) => {
    const offenders = [];
    for (const node of [root, ...root.querySelectorAll('*')]) {
      const style = window.getComputedStyle(node);
      if (!/(auto|scroll)/.test(style.overflowY)) continue;
      if (node.scrollHeight <= node.clientHeight + 1) continue;
      const borderX = (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
      const gutter = node.offsetWidth - borderX - node.clientWidth;
      if (gutter > 0) offenders.push({ cls: String(node.className).slice(0, 70), gutter });
    }
    return offenders;
  });
}

async function sheetScrollFacts(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return null;
    const sections = [...dialog.querySelectorAll('[data-testid^="sidebar-group-"], [data-testid^="sidebar-category-group-"]')];
    const scrollable = [dialog, ...dialog.querySelectorAll('*')].find((node) => {
      const style = window.getComputedStyle(node);
      return /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
    });
    return {
      rect: dialog.getBoundingClientRect().toJSON(),
      sectionCount: sections.length,
      firstSectionTop: sections[0]?.getBoundingClientRect().top ?? null,
      lastSectionTestId: sections.at(-1)?.getAttribute('data-testid') ?? null,
      lastSectionTop: sections.at(-1)?.getBoundingClientRect().top ?? null,
      lastSectionBottom: sections.at(-1)?.getBoundingClientRect().bottom ?? null,
      scrollHeight: scrollable?.scrollHeight ?? 0,
      clientHeight: scrollable?.clientHeight ?? 0,
    };
  });
}

test('mobile catalog filter sheet keeps 48px touch targets inside the viewport', async ({ page }) => {
  await installSession(page);
  await mockApi(page);

  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 667 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/listings?category=motor');
    await page.getByTestId('catalog-mobile-filters').click();

    // The wide-desktop sidebar stays mounted (hidden) at every width, so every
    // filter control has to be resolved inside the open sheet, not globally.
    const sheet = page.locator('[role="dialog"]').filter({ has: page.getByTestId('bottom-sheet-close') });
    const close = page.getByTestId('bottom-sheet-close');
    await expectMinTouchTarget(close, `sheet close @${viewport.width}`);
    await expectMinTouchTarget(sheet.getByTestId('sidebar-clear-filters'), `clear filters @${viewport.width}`);
    await expectMinTouchTarget(sheet.getByTestId('sidebar-filter-state'), `state select @${viewport.width}`);
    await expectMinTouchTarget(sheet.getByTestId('sidebar-filter-city'), `city select @${viewport.width}`);
    await expectMinTouchTarget(sheet.getByTestId('sidebar-filter-min-price'), `min price @${viewport.width}`);
    await expectMinTouchTarget(sheet.getByTestId('sidebar-filter-max-price'), `max price @${viewport.width}`);

    // The condition group starts collapsed, so its control only exists once opened.
    const conditionAccordion = sheet.locator('[data-testid="sidebar-group-condition"] > button');
    await conditionAccordion.click();
    await expectMinTouchTarget(conditionAccordion, `condition accordion @${viewport.width}`);
    await expectMinTouchTarget(sheet.getByTestId('sidebar-filter-condition'), `condition @${viewport.width}`);

    const accordion = sheet.locator('[data-testid="sidebar-group-location"] > button');
    await expectMinTouchTarget(accordion, `accordion header @${viewport.width}`);

    // The sheet itself must stay fully inside the viewport.
    const facts = await sheetScrollFacts(page);
    expect(facts.rect.top, `sheet top @${viewport.width}`).toBeGreaterThanOrEqual(-1);
    expect(facts.rect.bottom, `sheet bottom @${viewport.width}`).toBeLessThanOrEqual(viewport.height + 1);
    expect(facts.rect.bottom - facts.rect.top, `sheet height @${viewport.width}`).toBeLessThanOrEqual(viewport.height + 1);

    // No visible scrollbar anywhere inside the sheet.
    expect(await scrollbarGutters(page.locator('[role="dialog"]').first())).toEqual([]);
    await noHorizontalOverflow(page);

    // First and last filter groups are reachable through the sheet scroll.
    expect(facts.sectionCount).toBeGreaterThan(1);
    expect(facts.firstSectionTop).toBeGreaterThanOrEqual(-1);
    expect(facts.scrollHeight).toBeGreaterThan(facts.clientHeight);
    await page.locator('[role="dialog"]').first().evaluate((dialog) => {
      const scrollable = [dialog, ...dialog.querySelectorAll('*')].find((node) => {
        const style = window.getComputedStyle(node);
        return /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
      });
      if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
    });
    await expect.poll(async () => (await sheetScrollFacts(page)).lastSectionBottom).toBeLessThanOrEqual(viewport.height + 1);
    await expect(sheet.getByTestId(facts.lastSectionTestId)).toBeVisible();

    await close.click();
    await expect(page.getByTestId('sidebar-filters')).toBeHidden();
  }
});

test('mobile catalog filter state survives closing and reopening the sheet', async ({ page }) => {
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto('/listings?category=motor');

  const trigger = page.getByTestId('catalog-mobile-filters');
  const sheet = () => page.locator('[role="dialog"]').filter({ has: page.getByTestId('bottom-sheet-close') });

  await trigger.click();
  await sheet().getByTestId('sidebar-filter-state').selectOption('Veracruz');
  await sheet().getByTestId('sidebar-filter-city').selectOption('Boca del Río');
  await sheet().locator('[data-testid="sidebar-group-condition"] > button').click();
  await sheet().getByTestId('sidebar-filter-condition').selectOption('usado');
  await page.getByTestId('bottom-sheet-close').click();
  await expect(page.getByTestId('sidebar-filters')).toBeHidden();

  await trigger.click();
  await expect(sheet().getByTestId('sidebar-filter-state')).toHaveValue('Veracruz');
  await expect(sheet().getByTestId('sidebar-filter-city')).toHaveValue('Boca del Río');
  await expect(sheet().getByTestId('sidebar-filter-condition')).toHaveValue('usado');

  // Clear filters resets every control and stays clickable at touch size.
  await expectMinTouchTarget(sheet().getByTestId('sidebar-clear-filters'), 'clear filters');
  await sheet().getByTestId('sidebar-clear-filters').click();
  await expect(sheet().getByTestId('sidebar-filter-state')).toHaveValue('');
  await expect(sheet().getByTestId('sidebar-filter-city')).toHaveValue('');
  await expect(sheet().getByTestId('sidebar-filter-condition')).toHaveValue('');
  await noHorizontalOverflow(page);
});

test('tablet catalog filter drawer keeps 48px touch targets and scrolls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'tablet geometry runs once');
  await installSession(page);
  await mockApi(page);

  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto('/listings?category=motor');
    await page.getByTestId('catalog-mobile-filters').click();

    const drawer = page.getByTestId('catalog-tablet-filter-dialog');
    await expect(drawer).toBeVisible();
    await expectMinTouchTarget(page.getByTestId('catalog-tablet-filter-close'), `drawer close @${width}`);
    await expectMinTouchTarget(drawer.getByTestId('sidebar-clear-filters'), `clear filters @${width}`);
    await expectMinTouchTarget(drawer.getByTestId('sidebar-filter-state'), `state select @${width}`);
    await expectMinTouchTarget(drawer.getByTestId('sidebar-filter-min-price'), `min price @${width}`);
    await expectMinTouchTarget(drawer.locator('[data-testid="sidebar-group-location"] > button'), `accordion header @${width}`);

    const drawerBox = await drawer.boundingBox();
    expect(drawerBox.height, `drawer height @${width}`).toBeLessThanOrEqual(1024 + 1);
    expect(drawerBox.width, `drawer width @${width}`).toBeLessThanOrEqual(width * 0.88 + 1);

    expect(await scrollbarGutters(drawer)).toEqual([]);
    await noHorizontalOverflow(page);

    const scrollable = await drawer.evaluate((node) => node.scrollHeight > node.clientHeight + 1);
    expect(scrollable).toBe(true);

    await page.getByTestId('catalog-tablet-filter-close').click();
    await expect(drawer).toBeHidden();
  }
});

test('desktop catalog sidebar keeps its compact density', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop density runs once');
  await installSession(page);
  await mockApi(page);

  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/listings?category=motor');

    const sidebar = page.getByTestId('sidebar-filters');
    await expect(sidebar).toBeVisible();

    // Desktop stays untouched: the sidebar must not have been inflated to 48px.
    const accordion = await page.locator('[data-testid="sidebar-group-location"] > button').boundingBox();
    expect(accordion.height, `desktop accordion @${width}`).toBeLessThanOrEqual(42);
    const clear = await page.getByTestId('sidebar-clear-filters').boundingBox();
    expect(clear.height, `desktop clear filters @${width}`).toBeLessThanOrEqual(34);
    const state = await page.getByTestId('sidebar-filter-state').boundingBox();
    expect(state.height, `desktop state select @${width}`).toBeLessThanOrEqual(42);

    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox.width, `desktop sidebar width @${width}`).toBeLessThanOrEqual(290);
    await noHorizontalOverflow(page);
  }
});

test('mobile location popover controls reach 48px inside the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'mobile touch device only');

  await installSession(page);
  await mockApi(page);

  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 667 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/listings?category=motor');

    const opener = page.getByTestId('mobile-location-button');
    await expect(opener).toBeVisible();
    await opener.click();

    const popover = page.locator('.header-popover').filter({ has: page.getByTestId('mobile-location-apply') });
    await expect(popover).toBeVisible();
    await expectMinTouchTarget(popover.getByTestId('mobile-location-state'), `popover state @${viewport.width}`);
    await expectMinTouchTarget(popover.getByTestId('mobile-location-city'), `popover city @${viewport.width}`);
    await expectMinTouchTarget(popover.getByTestId('mobile-location-apply'), `popover apply @${viewport.width}`);

    // Long state/city names must not push the popover outside the viewport.
    await popover.getByTestId('mobile-location-state').selectOption('Veracruz');
    await popover.getByTestId('mobile-location-city').selectOption('Boca del Río');
    const box = await popover.boundingBox();
    expect(box.x, `popover left @${viewport.width}`).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width, `popover right @${viewport.width}`).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y, `popover top @${viewport.width}`).toBeGreaterThanOrEqual(-1);
    expect(box.y + box.height, `popover bottom @${viewport.width}`).toBeLessThanOrEqual(viewport.height + 1);
    await noHorizontalOverflow(page);
  }
});

test('tablet location popover controls reach 48px below the xl breakpoint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'tablet geometry runs once');

  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/listings?category=motor');

  const opener = page.getByTestId('desktop-location-button');
  await expect(opener).toBeVisible();
  await opener.click();

  const popover = page.locator('.header-popover').filter({ has: page.getByTestId('desktop-location-apply') });
  await expect(popover).toBeVisible();
  await expectMinTouchTarget(popover.getByTestId('desktop-location-state'), 'tablet popover state');
  await expectMinTouchTarget(popover.getByTestId('desktop-location-city'), 'tablet popover city');
  await expectMinTouchTarget(popover.getByTestId('desktop-location-cancel'), 'tablet popover cancel');
  await expectMinTouchTarget(popover.getByTestId('desktop-location-apply'), 'tablet popover apply');
  await noHorizontalOverflow(page);
});


