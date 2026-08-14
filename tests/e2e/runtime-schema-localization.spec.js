import { test, expect } from '@playwright/test';
import { getVerticalSeo } from '../../src/constants/verticalSeo.js';
import { getTranslations, loadLanguage, SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { getHomeFaqCopy } from '../../src/utils/homeFaqCopy.js';
import { getHomeMapCopy } from '../../src/utils/homeMapCopy.js';

async function setLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
}

async function schema(page) {
  const text = await page.locator('#schema-ld-json').textContent().catch(() => null);
  return text ? JSON.parse(text) : null;
}

const seller = {
  id: 77, name: 'QA Schema Seller', role: 'business', city: null, bio: null,
  avatar_url: null, website: null,
};

async function mockApi(page, ads = []) {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/users/77/profile')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(seller) });
    }
    if (path.endsWith('/users/77/business-profile')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true }) });
    }
    if (path.endsWith('/users/77/reviews')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reviews: [], average: 0, total: 0 }) });
    }
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: ads, total: ads.length }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (path.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of ['es', 'en', 'ru', 'zh', 'ar']) {
  test(`vertical JSON-LD follows ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/electronica', { waitUntil: 'domcontentloaded' });

    const seo = getVerticalSeo('/electronica', lang);
    const t = await loadLanguage(lang);
    await expect.poll(async () => (await schema(page))?.['@graph']?.[1]?.itemListElement?.[0]?.name).toBe(t.home);
    const data = await schema(page);
    const collection = data['@graph'][0];
    const breadcrumb = data['@graph'][1];

    expect(collection.name).toBe(seo.title);
    expect(collection.description).toBe(seo.description);
    expect(collection.inLanguage).toBe(lang === 'es' ? 'es-MX' : lang);
    expect(breadcrumb.itemListElement[0].name).toBe(t.home);
  });
}

test('company JSON-LD uses localized fallback and canonical identity', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await setLanguage(page, 'zh');
  await mockApi(page);
  await page.goto('/#company-77', { waitUntil: 'domcontentloaded' });

  const t = await loadLanguage('zh');
  await expect.poll(async () => (await schema(page))?.description).toBe(t.ai_brand_description);
  const data = await schema(page);
  expect(data['@type']).toBe('Store');
  expect(data.name).toBe(seller.name);
  expect(data.description).toBe(t.ai_brand_description);
  expect(data.address.addressCountry).toBe('MX');
  expect(data.address.addressLocality).toBeUndefined();
  expect(data.url).toBe('https://mercasto.com/vendedor/77');
});


const homeSchemaAd = {
  id: 501,
  title: 'QA schema listing',
  description: 'QA schema description',
  price: 123456,
  status: 'active',
  category: 'electronica',
  images: [],
};

for (const lang of SUPPORTED_LANGUAGES) {
  test(`home FAQ and ItemList schemas follow ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await setLanguage(page, lang);
    await mockApi(page, [homeSchemaAd]);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const faqCopy = getHomeFaqCopy(lang);
    const t = await loadLanguage(lang);
    await expect(page.getByText(faqCopy[0].question, { exact: true })).toBeVisible();
    await expect(page.getByText(getHomeMapCopy(lang).propertiesAll, { exact: true })).toBeVisible();
    await expect.poll(async () => {
      const text = await page.locator('#faq-schema').textContent().catch(() => null);
      return text ? JSON.parse(text)?.mainEntity?.[0]?.name : null;
    }).toBe(faqCopy[0].question);

    await expect.poll(async () => {
      const text = await page.locator('#itemlist-schema').textContent().catch(() => null);
      return text ? JSON.parse(text)?.name : null;
    }).toBe(`${t.featured || 'Mercasto'} · Mercasto`);

    const itemListText = await page.locator('#itemlist-schema').textContent();
    expect(JSON.parse(itemListText).itemListElement[0].item.name).toBe('QA schema listing');
  });
}
