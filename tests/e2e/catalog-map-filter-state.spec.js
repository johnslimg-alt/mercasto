import { test, expect } from '@playwright/test';

const categories = [
  { id: 1, slug: 'coches', name: { es: 'Coches', en: 'Cars' } },
];

async function installCatalogSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  });
}

async function mockCatalogApi(page, adRequests) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    if (pathname.endsWith('/ads') && request.method() === 'GET') {
      adRequests.push(url.toString());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 9,
            title: { es: 'Toyota Corolla', en: 'Toyota Corolla' },
            price: 325000,
            category: 'coches',
            condition: 'nuevo',
            listing_type: 'Venta',
            state: 'Nuevo León',
            city: 'Monterrey',
            latitude: 25.6866,
            longitude: -100.3161,
            attributes: {},
          }],
          total: 1,
          current_page: 1,
          last_page: 1,
        }),
      });
    }
    if (pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) });
    }
    if (pathname.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (pathname.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

function buildMapStateUrl() {
  const params = new URLSearchParams({
    search: 'corolla',
    category: 'coches',
    location: 'Monterrey',
    state: 'Nuevo León',
    city: 'Monterrey',
    min_price: '100000',
    max_price: '450000',
    lat: '25.6866',
    lng: '-100.3161',
    radius: '35',
  });
  params.set('condition', 'nuevo');
  params.append('filters[listing_type][]', 'Venta');
  params.set('filters[sort]', 'price_desc');
  params.set('filters[location_state]', 'Nuevo León');
  params.set('filters[location_city]', 'Monterrey');
  return `/listings?${params.toString()}`;
}

test('map controls hydrate from catalog state and search-area preserves canonical filters', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const adRequests = [];
  await installCatalogSession(page);
  await mockCatalogApi(page, adRequests);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(buildMapStateUrl());

  await expect(page.getByTestId('catalog-map-shell')).toBeVisible();
  await expect.poll(() => adRequests.some((requestUrl) => {
    const params = new URL(requestUrl).searchParams;
    return params.get('lat') === '25.6866'
      && params.get('lng') === '-100.3161'
      && params.get('radius') === '35';
  })).toBe(true);
  const mapInternalFetches = () => adRequests.filter((requestUrl) => {
    const params = new URL(requestUrl).searchParams;
    return params.get('per_page') === '80' && !params.has('page');
  });
  expect(mapInternalFetches()).toHaveLength(0);

  await page.getByTestId('map-expand').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId('map-filter-toggle').click();

  await expect(page.getByTestId('map-filter-query')).toHaveValue('corolla');
  await expect(page.getByTestId('map-filter-category')).toHaveValue('coches');
  await expect(page.getByTestId('map-filter-state')).toHaveValue('Nuevo León');
  await expect(page.getByTestId('map-filter-city')).toHaveValue('Monterrey');
  await expect(page.getByTestId('map-filter-min-price')).toHaveValue('100000');
  await expect(page.getByTestId('map-filter-max-price')).toHaveValue('450000');
  await expect(page.getByTestId('map-filter-listing-type')).toHaveValue('Venta');

  await page.getByTestId('map-filter-listing-type').selectOption('Renta');
  const requestCountBeforeAreaSearch = adRequests.length;
  await page.getByTestId('map-search-area').click();
  await expect.poll(() => new URL(page.url()).searchParams.getAll('filters[listing_type][]')).toEqual(['Renta']);
  const urlParams = new URL(page.url()).searchParams;
  expect(urlParams.get('search')).toBe('corolla');
  expect(urlParams.get('category')).toBe('coches');
  expect(urlParams.get('min_price')).toBe('100000');
  expect(urlParams.get('max_price')).toBe('450000');
  expect(urlParams.get('condition')).toBe('nuevo');
  expect(urlParams.get('filters[sort]')).toBe('price_desc');
  expect(Number.isFinite(Number(urlParams.get('lat')))).toBe(true);
  expect(Number.isFinite(Number(urlParams.get('lng')))).toBe(true);
  expect(Number(urlParams.get('radius'))).toBeGreaterThan(0);

  await expect.poll(() => adRequests.slice(requestCountBeforeAreaSearch).some((requestUrl) => {
    const params = new URL(requestUrl).searchParams;
    return params.getAll('filters[listing_type][]').includes('Renta')
      && params.get('search') === 'corolla'
      && params.get('category') === 'coches'
      && params.has('lat')
      && params.has('lng')
      && params.has('radius');
  })).toBe(true);

  await page.reload();
  await expect.poll(() => new URL(page.url()).searchParams.getAll('filters[listing_type][]')).toEqual(['Renta']);
  await page.getByTestId('map-expand').click();
  await page.getByTestId('map-filter-toggle').click();
  await expect(page.getByTestId('map-filter-query')).toHaveValue('corolla');
  await expect(page.getByTestId('map-filter-category')).toHaveValue('coches');
  await expect(page.getByTestId('map-filter-listing-type')).toHaveValue('Renta');
  await expect(page.getByTestId('map-filter-state')).toHaveValue('Nuevo León');
  await expect(page.getByTestId('map-filter-city')).toHaveValue('Monterrey');
});

test('map search-area clears price bounds when the map inputs are emptied', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const adRequests = [];
  await installCatalogSession(page);
  await mockCatalogApi(page, adRequests);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(buildMapStateUrl());

  await page.getByTestId('map-expand').click();
  await page.getByTestId('map-filter-toggle').click();
  await page.getByTestId('map-filter-min-price').fill('');
  await page.getByTestId('map-filter-max-price').fill('');
  const requestCountBeforeAreaSearch = adRequests.length;
  await page.getByTestId('map-search-area').click();

  await expect.poll(() => {
    const params = new URL(page.url()).searchParams;
    return [params.has('min_price'), params.has('max_price')];
  }).toEqual([false, false]);

  await expect.poll(() => adRequests.slice(requestCountBeforeAreaSearch).some((requestUrl) => {
    const params = new URL(requestUrl).searchParams;
    return params.has('lat') && params.has('lng') && params.has('radius')
      && !params.has('min_price') && !params.has('max_price');
  })).toBe(true);
});

test('map reset immediately clears catalog filters while preserving the current geo area', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const adRequests = [];
  await installCatalogSession(page);
  await mockCatalogApi(page, adRequests);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(buildMapStateUrl());

  await page.getByTestId('map-expand').click();
  await page.getByTestId('map-filter-toggle').click();
  const requestCountBeforeReset = adRequests.length;
  await page.getByTestId('map-clear-filters').click();

  await expect(page.getByTestId('map-filter-query')).toHaveValue('');
  await expect(page.getByTestId('map-filter-category')).toHaveValue('');
  await expect(page.getByTestId('map-filter-state')).toHaveValue('');
  await expect(page.getByTestId('map-filter-min-price')).toHaveValue('');
  await expect(page.getByTestId('map-filter-max-price')).toHaveValue('');
  await expect(page.getByTestId('map-filter-listing-type')).toHaveValue('');

  await expect.poll(() => {
    const params = new URL(page.url()).searchParams;
    return {
      search: params.has('search'),
      category: params.has('category'),
      location: params.has('location'),
      state: params.has('state'),
      city: params.has('city'),
      minPrice: params.has('min_price'),
      maxPrice: params.has('max_price'),
      condition: params.has('condition'),
      listingType: params.has('filters[listing_type][]'),
      sort: params.has('filters[sort]'),
      locationState: params.has('filters[location_state]'),
      locationCity: params.has('filters[location_city]'),
      lat: params.has('lat'),
      lng: params.has('lng'),
      radius: params.has('radius'),
    };
  }).toEqual({
    search: false,
    category: false,
    location: false,
    state: false,
    city: false,
    minPrice: false,
    maxPrice: false,
    condition: false,
    listingType: false,
    sort: false,
    locationState: false,
    locationCity: false,
    lat: true,
    lng: true,
    radius: true,
  });

  await expect.poll(() => adRequests.slice(requestCountBeforeReset).some((requestUrl) => {
    const params = new URL(requestUrl).searchParams;
    return params.has('lat') && params.has('lng') && params.has('radius')
      && !params.has('search')
      && !params.has('category')
      && !params.has('min_price')
      && !params.has('max_price')
      && !params.has('condition')
      && !params.has('filters[listing_type][]');
  })).toBe(true);
});
