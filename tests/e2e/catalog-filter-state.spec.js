import { test, expect } from '@playwright/test';

const localeCases = ['es', 'en', 'ru', 'ar'];
const translations = {};
for (const lang of localeCases) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

async function mockPublicCatalogApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    if (pathname.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (pathname.endsWith('/category-attributes') || pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of localeCases) {
  test(`desktop filters keep canonical URL values in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.addInitScript((savedLang) => localStorage.setItem('lang', savedLang), lang);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await mockPublicCatalogApi(page);
    const adRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/ads?')) adRequests.push(request.url());
    });
    await page.goto('/listings');

    const venta = page.getByTestId('sidebar-filter-listing_type-Venta');
    await expect(venta.locator('xpath=..')).toContainText(translations[lang].gf_venta);
    await venta.check();
    await page.getByTestId('sidebar-filter-sort').selectOption('price_asc');
    await page.getByTestId('sidebar-filter-state').selectOption('Jalisco');
    await page.getByTestId('sidebar-filter-city').selectOption('Guadalajara');
    await page.getByTestId('sidebar-filter-min-price').fill('100');

    await expect.poll(() => page.url()).toContain('filters%5Blisting_type%5D%5B%5D=Venta');
    await expect(page).toHaveURL(/filters%5Bsort%5D=price_asc/);
    await expect(page).toHaveURL(/filters%5Blocation_state%5D=Jalisco/);
    await expect(page).toHaveURL(/filters%5Blocation_city%5D=Guadalajara/);
    await expect(page).toHaveURL(/min_price=100/);
    expect(new URL(page.url()).searchParams.has('lat')).toBeFalsy();
    expect(new URL(page.url()).searchParams.has('lng')).toBeFalsy();
    await expect.poll(() => adRequests.some((url) =>
      url.includes('filters%5Blisting_type%5D%5B%5D=Venta')
      && url.includes('filters%5Bsort%5D=price_asc')
      && url.includes('filters%5Blocation_city%5D=Guadalajara')
    )).toBeTruthy();

    const filteredUrl = page.url();
    await page.reload();
    await expect(page).toHaveURL(filteredUrl);
    await expect(page.getByTestId('sidebar-filter-listing_type-Venta')).toBeChecked();
    await expect(page.getByTestId('sidebar-filter-sort')).toHaveValue('price_asc');
    await expect(page.getByTestId('sidebar-filter-state')).toHaveValue('Jalisco');
    await expect(page.getByTestId('sidebar-filter-city')).toHaveValue('Guadalajara');
    await expect(page.getByTestId('sidebar-filter-min-price')).toHaveValue('100');
  });
}

test('mobile filter sheet persists canonical state and clear-all resets it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
  await mockPublicCatalogApi(page);
  await page.goto('/listings');
  await page.getByTestId('catalog-mobile-filters').click();

  const sheet = page.getByRole('dialog');
  await sheet.getByTestId('sidebar-filter-listing_type').selectOption('Venta');
  await sheet.getByTestId('sidebar-filter-sort').selectOption('price_desc');
  await sheet.getByTestId('sidebar-filter-state').selectOption('Nuevo León');
  await sheet.getByTestId('sidebar-filter-city').selectOption('Monterrey');

  await expect.poll(() => page.url()).toContain('filters%5Blisting_type%5D%5B%5D=Venta');
  await expect(page).toHaveURL(/filters%5Bsort%5D=price_desc/);
  await expect(page).toHaveURL(/filters%5Blocation_city%5D=Monterrey/);

  await page.reload();
  await page.getByTestId('catalog-mobile-filters').click();
  const restoredSheet = page.getByRole('dialog');
  await expect(restoredSheet.getByTestId('sidebar-filter-listing_type')).toHaveValue('Venta');
  await expect(restoredSheet.getByTestId('sidebar-filter-sort')).toHaveValue('price_desc');
  await expect(restoredSheet.getByTestId('sidebar-filter-city')).toHaveValue('Monterrey');

  await restoredSheet.getByTestId('sidebar-clear-filters').click();
  await expect.poll(() => page.url()).not.toContain('filters%5B');
});
test('saved search restores full canonical filter state into URL, API and desktop controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const user = { id: 91, name: 'QA User', email: 'qa@example.test', role: 'individual', is_verified: true };
  const alert = {
    id: 88,
    name: 'Corolla Monterrey',
    query: 'corolla',
    category_slug: 'coches',
    state: 'Nuevo León',
    city: 'Monterrey',
    min_price: 100000,
    max_price: 450000,
    is_active: true,
    filters: {
      condition: ['nuevo'],
      listing_type: ['Venta'],
      sort: 'price_desc',
      location_state: 'Nuevo León',
      location_city: 'Monterrey',
    },
  };
  const adRequests = [];
  await page.addInitScript(({ savedUser }) => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('auth_token', 'catalog-filter-state-token');
    localStorage.setItem('user', JSON.stringify(savedUser));
  }, { savedUser: user });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    if (pathname.endsWith('/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (pathname.endsWith('/user/search-alerts') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([alert]) });
    }
    if (pathname.endsWith('/ads') && request.method() === 'GET') {
      adRequests.push(url.toString());
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (pathname.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.endsWith('/favorites')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/listings');
  await expect(page.getByText('Corolla Monterrey', { exact: true })).toBeVisible();
  await page.getByTestId('saved-search-card-88').locator('button').first().click();

  await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('corolla');
  const assertCanonicalUrl = () => {
    const params = new URL(page.url()).searchParams;
    expect(params.get('category')).toBe('coches');
    expect(params.get('location')).toBe('Monterrey');
    expect(params.get('min_price')).toBe('100000');
    expect(params.get('max_price')).toBe('450000');
    expect(params.get('condition')).toBe('nuevo');
    expect(params.getAll('filters[listing_type][]')).toEqual(['Venta']);
    expect(params.get('filters[sort]')).toBe('price_desc');
    expect(params.get('filters[location_state]')).toBe('Nuevo León');
    expect(params.get('filters[location_city]')).toBe('Monterrey');
  };
  assertCanonicalUrl();
  await expect(page.getByTestId('sidebar-filter-condition-nuevo')).toBeChecked();
  await expect(page.getByTestId('sidebar-filter-listing_type-Venta')).toBeChecked();
  await expect(page.getByTestId('sidebar-filter-sort')).toHaveValue('price_desc');
  await expect(page.getByTestId('sidebar-filter-state')).toHaveValue('Nuevo León');
  await expect(page.getByTestId('sidebar-filter-city')).toHaveValue('Monterrey');

  await expect.poll(() => adRequests.some((requestUrl) => {
    const params = new URL(requestUrl).searchParams;
    return params.get('condition') === 'nuevo'
      && params.getAll('filters[listing_type][]').includes('Venta')
      && params.get('filters[sort]') === 'price_desc'
      && params.get('filters[location_state]') === 'Nuevo León'
      && params.get('filters[location_city]') === 'Monterrey';
  })).toBe(true);

  await page.reload();
  await expect(page.getByTestId('sidebar-filter-condition-nuevo')).toBeChecked();
  await expect(page.getByTestId('sidebar-filter-listing_type-Venta')).toBeChecked();
  await expect(page.getByTestId('sidebar-filter-sort')).toHaveValue('price_desc');
  await expect(page.getByTestId('sidebar-filter-state')).toHaveValue('Nuevo León');
  await expect(page.getByTestId('sidebar-filter-city')).toHaveValue('Monterrey');
  assertCanonicalUrl();
});


test('saving a filtered catalog persists condition and dynamic filters in search alert payload', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const user = { id: 91, name: 'QA User', email: 'qa@example.test', role: 'individual', is_verified: true };
  let savedPayload = null;

  await page.addInitScript(({ savedUser }) => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('auth_token', 'catalog-filter-save-token');
    localStorage.setItem('user', JSON.stringify(savedUser));
  }, { savedUser: user });
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    if (pathname.endsWith('/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (pathname.endsWith('/user/search-alerts') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.endsWith('/user/search-alerts') && request.method() === 'POST') {
      savedPayload = request.postDataJSON();
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 99, name: 'Saved QA', ...savedPayload, category_slug: savedPayload.category, is_active: true }),
      });
    }
    if (pathname.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (pathname.endsWith('/category-attributes') || pathname.endsWith('/favorites')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  const params = new URLSearchParams({
    search: 'corolla',
    category: 'coches',
    location: 'Monterrey',
    state: 'Nuevo León',
    city: 'Monterrey',
    min_price: '100000',
    max_price: '450000',
    condition: 'nuevo',
  });
  params.append('filters[listing_type][]', 'Venta');
  params.set('filters[sort]', 'price_desc');
  params.set('filters[location_state]', 'Nuevo León');
  params.set('filters[location_city]', 'Monterrey');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/listings?${params.toString()}`);
  await expect(page.getByTestId('sidebar-filter-condition-nuevo')).toBeChecked();
  await expect(page.getByTestId('sidebar-filter-listing_type-Venta')).toBeChecked();
  await expect(page.getByTestId('sidebar-filter-sort')).toHaveValue('price_desc');
  await expect(page.getByTestId('sidebar-filter-state')).toHaveValue('Nuevo León');
  await expect(page.getByTestId('sidebar-filter-city')).toHaveValue('Monterrey');

  await page.getByTestId('catalog-save-search').click();
  await expect.poll(() => savedPayload).not.toBeNull();
  expect(savedPayload.query).toBe('corolla');
  expect(savedPayload.category).toBe('coches');
  expect(savedPayload.min_price).toBe('100000');
  expect(savedPayload.max_price).toBe('450000');
  expect(savedPayload.city).toBe('Monterrey');
  expect(savedPayload.state).toBe('Nuevo León');
  expect(savedPayload.filters.condition).toEqual(['nuevo']);
  expect(savedPayload.filters.listing_type).toEqual(['Venta']);
  expect(savedPayload.filters.sort).toBe('price_desc');
  expect(savedPayload.filters.location_state).toBe('Nuevo León');
  expect(savedPayload.filters.location_city).toBe('Monterrey');
});
