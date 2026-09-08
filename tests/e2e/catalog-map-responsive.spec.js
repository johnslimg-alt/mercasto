import { test, expect } from '@playwright/test';

test('catalog map follows untouched breakpoint defaults', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/listings');

  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Ocultar mapa');
  await expect(page.getByTestId('catalog-map-shell')).toHaveCSS('height', '360px');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Abrir mapa');
  await expect(page.getByTestId('catalog-map-shell')).toHaveCSS('height', '60px');

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Ocultar mapa');
  await expect(page.getByTestId('catalog-map-shell')).toHaveCSS('height', '360px');
});

test('catalog map preserves an explicit user collapse choice across resize', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/listings');

  await page.getByTestId('catalog-map-toggle').click();
  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Abrir mapa');
  await expect(page.getByTestId('catalog-map-shell')).toHaveCSS('height', '60px');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Abrir mapa');

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Abrir mapa');
  await expect(page.getByTestId('catalog-map-shell')).toHaveCSS('height', '60px');
});

test('mobile catalog primary toolbar controls keep 48px hit targets without overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');

  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/listings');

    for (const testId of [
      'catalog-mobile-filters',
      'catalog-map-toggle',
      'catalog-grid-view',
      'catalog-list-view',
    ]) {
      const control = page.getByTestId(testId);
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box?.height, `${testId} at ${width}px`).toBeGreaterThanOrEqual(48);
      expect(box?.x, `${testId} left edge at ${width}px`).toBeGreaterThanOrEqual(0);
      expect((box?.x || 0) + (box?.width || 0), `${testId} right edge at ${width}px`).toBeLessThanOrEqual(width);
    }

    await expect(page.getByTestId('catalog-results-title')).toBeHidden();
    const resultsToolbar = await page.getByTestId('catalog-results-toolbar').boundingBox();
    expect(resultsToolbar?.width, `results toolbar width at ${width}px`).toBeLessThanOrEqual(width);
    const gridBox = await page.getByTestId('catalog-grid-view').boundingBox();
    const listBox = await page.getByTestId('catalog-list-view').boundingBox();
    expect(Math.abs((gridBox?.width || 0) - (listBox?.width || 0)), `balanced view toggle at ${width}px`).toBeLessThanOrEqual(2);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});


test('catalog map status never covers the near-me control', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/listings');
    const shell = page.getByTestId('catalog-map-shell');
    await expect(shell).toBeVisible();

    if ((await shell.boundingBox())?.height <= 60) {
      await page.getByTestId('catalog-map-toggle').click();
    }

    const status = page.getByTestId('catalog-map-status-pill');
    const nearMe = page.getByTestId('map-near-me');
    await expect(status).toBeVisible();
    await expect(nearMe).toBeVisible();
    const statusBox = await status.boundingBox();
    const nearMeBox = await nearMe.boundingBox();
    expect(statusBox).not.toBeNull();
    expect(nearMeBox).not.toBeNull();

    const horizontalOverlap = Math.max(0, Math.min(statusBox.x + statusBox.width, nearMeBox.x + nearMeBox.width) - Math.max(statusBox.x, nearMeBox.x));
    const verticalOverlap = Math.max(0, Math.min(statusBox.y + statusBox.height, nearMeBox.y + nearMeBox.height) - Math.max(statusBox.y, nearMeBox.y));
    expect(horizontalOverlap * verticalOverlap, `map control overlap at ${width}px`).toBe(0);
  }
});

async function installStandaloneMapSession(page, { denyGeolocation = false } = {}) {
  await page.addInitScript(({ deny }) => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    if (deny) {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition(_success, error) {
            error({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
          },
        },
      });
    }
  }, { deny: denyGeolocation });
}

async function mockStandaloneMapApi(page) {
  const mapAd = {
    id: 73001,
    title: { es: 'Negocio de prueba' },
    description: { es: 'Negocio con ubicación real para validar el mapa.' },
    price: 350000,
    category: 'negocios',
    condition: 'nuevo',
    state: 'Veracruz',
    city: 'Veracruz',
    latitude: 19.1738,
    longitude: -96.1342,
    attributes: { tipo_negocio: 'Traspaso', sector: 'Servicios' },
  };
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/ads') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [mapAd], total: 1, current_page: 1, last_page: 1 }) });
    }
    if (url.pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 7, slug: 'negocios', name: { es: 'Negocios' } },
        { id: 1, slug: 'motor', name: { es: 'Motor' } },
        { id: 2, slug: 'inmobiliaria', name: { es: 'Inmuebles' } },
        { id: 3, slug: 'servicios', name: { es: 'Servicios' } },
        { id: 4, slug: 'empleo', name: { es: 'Empleos' } },
      ]) });
    }
    if (url.pathname.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (url.pathname.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function openStandaloneFullscreenMap(page, path = '/negocios') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  const expand = page.getByTestId('map-expand').last();
  await expect(expand).toBeVisible({ timeout: 15_000 });
  await expand.scrollIntoViewIfNeeded();
  await expand.click();
  const dialog = page.getByRole('dialog', { name: 'Mapa interactivo' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('standalone fullscreen map uses responsive filter geometry instead of a full-width filter slab', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installStandaloneMapSession(page);
  await mockStandaloneMapApi(page);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 820, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const dialog = await openStandaloneFullscreenMap(page);
    await dialog.getByTestId('map-filter-toggle').click();
    const panel = dialog.getByTestId('map-filter-panel');
    const canvas = dialog.getByTestId('map-fullscreen-canvas');
    await expect(panel).toBeVisible();
    await dialog.getByTestId('map-filter-section-listing-type').locator('button').first().click();
    await dialog.getByTestId('map-filter-section-condition').locator('button').first().click();

    const panelBox = await panel.boundingBox();
    const canvasBox = await canvas.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(canvasBox).not.toBeNull();
    if (viewport.width >= 1024) {
      expect(panelBox.width).toBeGreaterThanOrEqual(350);
      expect(panelBox.width).toBeLessThanOrEqual(380);
      expect(canvasBox.x).toBeGreaterThanOrEqual(panelBox.x + panelBox.width - 1);
      await expect(dialog.getByTestId('map-results-panel')).toBeVisible();
    } else {
      expect(panelBox.width).toBeLessThanOrEqual(viewport.width);
      expect(panelBox.height).toBeLessThanOrEqual(viewport.height * (viewport.width >= 640 ? 0.78 : 0.72) + 2);
      expect(canvasBox.x).toBeLessThanOrEqual(1);
      await expect(dialog.getByTestId('map-results-panel')).toBeHidden();
    }

    await expect(dialog.getByTestId('map-filter-category')).toHaveCount(0);
    for (const control of [
      dialog.getByTestId('map-filter-state'),
      dialog.getByTestId('map-filter-city'),
      dialog.getByTestId('map-filter-listing-type'),
      dialog.getByTestId('map-condition-nuevo'),
      dialog.getByTestId('map-only-real-gps'),
      dialog.getByTestId('map-clear-filters'),
      dialog.getByTestId('map-search-area'),
    ]) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(viewport.width >= 1024 ? 36 : 44);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `fullscreen overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    await dialog.getByTestId('map-close').click();
  }
});

test('standalone negocios map search-area keeps its category and sends filters to catalog results', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installStandaloneMapSession(page);
  await mockStandaloneMapApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const dialog = await openStandaloneFullscreenMap(page);
  await dialog.getByTestId('map-filter-toggle').click();

  await expect(dialog.getByTestId('map-filter-category')).toHaveCount(0);
  await dialog.getByTestId('map-filter-section-listing-type').locator('button').first().click();
  await dialog.getByTestId('map-filter-section-condition').locator('button').first().click();
  await dialog.getByTestId('map-filter-section-dynamic').locator('button').first().click();
  await dialog.getByTestId('map-filter-state').selectOption('Veracruz');
  await dialog.getByTestId('map-filter-city').selectOption('Veracruz');
  await dialog.getByTestId('map-filter-min-price').fill('100000');
  await dialog.getByTestId('map-filter-max-price').fill('500000');
  await dialog.getByTestId('map-filter-listing-type').selectOption('Venta');
  await dialog.getByTestId('map-filter-dynamic-tipo_negocio').selectOption('Traspaso');
  await dialog.getByTestId('map-condition-nuevo').click();

  await dialog.getByTestId('map-clear-filters').click();
  await expect(dialog.getByTestId('map-filter-dynamic-tipo_negocio')).toBeVisible();
  await expect(dialog.getByTestId('map-filter-state')).toHaveValue('');

  await dialog.getByTestId('map-filter-state').selectOption('Veracruz');
  await dialog.getByTestId('map-filter-city').selectOption('Veracruz');
  await dialog.getByTestId('map-filter-min-price').fill('100000');
  await dialog.getByTestId('map-filter-max-price').fill('500000');
  await dialog.getByTestId('map-filter-listing-type').selectOption('Venta');
  await dialog.getByTestId('map-filter-dynamic-tipo_negocio').selectOption('Traspaso');
  await dialog.getByTestId('map-condition-nuevo').click();
  await dialog.getByTestId('map-search-area').click();

  await expect(page).toHaveURL(/\/listings\?/);
  const params = new URL(page.url()).searchParams;
  expect(params.get('category')).toBe('negocios');
  expect(params.get('state')).toBe('Veracruz');
  expect(params.get('city')).toBe('Veracruz');
  expect(params.get('min_price')).toBe('100000');
  expect(params.get('max_price')).toBe('500000');
  expect(params.get('condition')).toBe('nuevo');
  expect(params.getAll('filters[listing_type][]')).toEqual(['Venta']);
  expect(params.getAll('filters[tipo_negocio][]')).toEqual(['Traspaso']);
  expect(Number.isFinite(Number(params.get('lat')))).toBe(true);
  expect(Number.isFinite(Number(params.get('lng')))).toBe(true);
  expect(Number(params.get('radius'))).toBeGreaterThan(0);
});

test('standalone map result chip opens the actual listing instead of acting like a dead button', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installStandaloneMapSession(page);
  await mockStandaloneMapApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const dialog = await openStandaloneFullscreenMap(page);
  const chip = dialog.getByTestId('map-result-chip').first();
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page).toHaveURL(/#ad-73001$/);
  await expect(page.getByText('Negocio de prueba', { exact: true }).first()).toBeVisible();
});

test('fullscreen near-me reports denied geolocation instead of silently doing nothing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installStandaloneMapSession(page, { denyGeolocation: true });
  await mockStandaloneMapApi(page);
  await page.setViewportSize({ width: 820, height: 900 });
  const dialog = await openStandaloneFullscreenMap(page);
  await dialog.getByTestId('map-fullscreen-near-me').click();
  const error = dialog.getByTestId('map-location-error');
  await expect(error).toBeVisible();
  await expect(error).not.toHaveText('');
});

test('shared fullscreen map controls stay usable on representative vertical routes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installStandaloneMapSession(page);
  await mockStandaloneMapApi(page);
  await page.setViewportSize({ width: 820, height: 900 });

  for (const path of ['/negocios', '/motor', '/inmuebles', '/servicios', '/empleos']) {
    const dialog = await openStandaloneFullscreenMap(page, path);
    const filterToggle = dialog.getByTestId('map-filter-toggle');
    const nearMe = dialog.getByTestId('map-fullscreen-near-me');
    const close = dialog.getByTestId('map-close');
    for (const control of [filterToggle, nearMe, close]) {
      const box = await control.boundingBox();
      expect(box?.height, `${path} primary map control`).toBeGreaterThanOrEqual(48);
    }
    await filterToggle.click();
    await expect(dialog.getByTestId('map-filter-panel')).toBeVisible();
    await expect(dialog.getByTestId('map-search-area')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(1);
    await close.click();
  }
});
