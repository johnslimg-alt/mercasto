import { expect, test } from '@playwright/test';
import { subcategoriesByLang } from '../../src/constants/subcategoryTranslations';
import { filterOptionLabel, loadFilterOptionLanguage } from '../../src/utils/filterOptionTranslations.js';

const LANGUAGES = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];
const RTL_LANGUAGES = new Set(['ar']);
const translations = {};
for (const lang of LANGUAGES) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

const localizedName = (prefix) => Object.fromEntries(
  LANGUAGES.map((lang) => [lang, `${prefix}-${lang}`]),
);

const categories = [
  { id: 1, slug: 'productos', name: localizedName('Products') },
  { id: 2, slug: 'electronica', name: localizedName('Electronics') },
  { id: 3, slug: 'hogar', name: localizedName('Home') },
  { id: 4, slug: 'moda', name: localizedName('Fashion') },
  { id: 5, slug: 'ocio', name: localizedName('Hobbies') },
  { id: 6, slug: 'infantil', name: localizedName('Kids') },
  { id: 7, slug: 'mascotas', name: localizedName('Pets') },
  { id: 8, slug: 'formacion', name: localizedName('Books') },
  { id: 9, slug: 'coches', name: localizedName('Cars') },
  { id: 10, slug: 'qa-test', name: localizedName('QA') },
];
async function installSession(page, lang) {
  await page.addInitScript(({ savedLang }) => {
    const user = {
      id: 91,
      name: 'QA User',
      email: 'qa@example.test',
      role: 'individual',
      is_verified: true,
      account_verified: true,
    };
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('auth_token', 'post-edit-localization-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success) {
          success({ coords: { latitude: 19.4326, longitude: -99.1332 } });
        },
      },
    });
  }, { savedLang: lang });
}
async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith('/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 91,
          name: 'QA User',
          email: 'qa@example.test',
          role: 'individual',
          is_verified: true,
          account_verified: true,
        }),
      });
    }
    if (path.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) });
    }
    if (path.includes('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/ads/9/edit')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 9,
          title: 'Toyota Corolla QA',
          description: 'QA description',
          price: 325000,
          category: 'coches',
          condition: 'nuevo',
          state: 'Aguascalientes',
          city: 'Aguascalientes',
          location: 'Aguascalientes',
          latitude: 21.88,
          longitude: -102.29,
          image_url: null,
          attributes: { carroceria: 'Sedán' },
          status: 'active',
        }),
      });
    }
    if (path.endsWith('/ads/generate-description') && method === 'POST') {
      return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'ERROR ESPAÑOL DEL SERVIDOR' }) });
    }
    if (path.endsWith('/ads/9') && method === 'POST') {
      return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ message: 'ERROR ESPAÑOL AL GUARDAR' }) });
    }
    if (path.endsWith('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], next_page_url: null }) });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false, twitter: false, telegram: false }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expectNoOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

function firstMotorLabel(lang) {
  const values = subcategoriesByLang[lang]?.motor;
  if (Array.isArray(values)) return values[0];
  return values ? Object.values(values)[0] : null;
}
async function assertPostFlow(page, lang) {
  const t = translations[lang];
  await page.goto('/post');
  await expect(page.getByText(t.post_title, { exact: true })).toBeVisible();
  await expect(page.getByTestId('publish-step-2')).toHaveText(t.post_step_details);
  await expect(page.getByTestId('publish-step-3')).toHaveText(t.post_step_contact);

  await page.getByRole('main').getByRole('button', { name: `Products-${lang}` }).click();
  await expect(page.getByText(t.post_select_product_type, { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: `Electronics-${lang}` })).toBeVisible();

  await page.getByRole('main').getByRole('button', { name: `Cars-${lang}` }).click();
  await expect(page.getByText(t.post_select_subcategory, { exact: true })).toBeVisible();
  const motorLabel = firstMotorLabel(lang);
  if (motorLabel) {
    const motorButton = page.getByRole('button', { name: motorLabel }).first();
    await expect(motorButton).toBeVisible();
    await motorButton.click();
  }

  await page.getByRole('button', { name: t.next_btn }).filter({ visible: true }).click();
  await expect(page.getByTestId('publish-title')).toBeVisible();
  await expect(page.getByText(t.sale_details, { exact: true })).toBeVisible();
  await expect(page.locator('option').filter({ hasText: t.gf_venta }).first()).toHaveText(t.gf_venta);
  await expect(page.locator('option').filter({ hasText: t.gf_no_warranty }).first()).toHaveText(t.gf_no_warranty);
  const postBodyType = page.getByTestId('post-attribute-carroceria');
  await expect(postBodyType.locator('option[value="Sedán"]')).toHaveText(filterOptionLabel('carroceria', 'Sedán', lang));
  await postBodyType.selectOption('Sedán');
  await expect(postBodyType).toHaveValue('Sedán');
  await page.getByTestId('publish-title').fill('QA listing');
  await page.getByTestId('publish-price').fill('1250');
  await page.getByTestId('publish-description').fill('QA description');
  await page.getByRole('button', { name: t.next_btn }).filter({ visible: true }).click();

  await expect(page.getByText(t.post_contact_heading, { exact: true })).toBeVisible();
  await expect(page.getByTestId('publish-gps')).toContainText(t.post_use_current_gps);
  await expect(page.getByText(t.post_whatsapp_question, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: t.post_phone_number, exact: true }).click();
  await expect(page.getByText(t.post_phone_digits, { exact: true })).toBeVisible();
  await page.getByTestId('publish-gps').click();

  await expect.poll(() => page.evaluate(() => document.documentElement.dir))
    .toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
  await expectNoOverflow(page);

  if (lang !== 'es') {
    const body = await page.locator('body').innerText();
    for (const literal of ['Selecciona una Categoría', 'Usar GPS actual', '¿Cómo te contactan?', 'Teléfono (10 dígitos)']) {
      expect(body).not.toContain(literal);
    }
  }
}
async function assertEditFlow(page, lang) {
  const t = translations[lang];
  await page.goto('/anuncio/9/editar');
  await expect(page.getByRole('heading', { name: t.edit_ad })).toBeVisible();
  await expect(page.getByTestId('edit-ad-title')).toHaveValue('Toyota Corolla QA');
  await expect(page.getByRole('button', { name: t.condition_like_new })).toBeVisible();
  await expect(page.getByRole('button', { name: t.condition_good })).toBeVisible();
  await expect(page.getByRole('button', { name: t.condition_fair })).toBeVisible();
  await expect(page.getByRole('button', { name: t.condition_for_parts })).toBeVisible();

  const editBodyType = page.getByTestId('edit-attribute-carroceria');
  await expect(editBodyType).toHaveValue('Sedán');
  await expect(editBodyType.locator('option[value="Sedán"]')).toHaveText(filterOptionLabel('carroceria', 'Sedán', lang));

  await page.getByTestId('edit-ad-generate-ai').click();
  await expect(page.getByText(t.ai_description_failed, { exact: true })).toBeVisible();
  await expect(page.getByText('ERROR ESPAÑOL DEL SERVIDOR', { exact: true })).toHaveCount(0);

  await page.getByTestId('edit-ad-save').click();
  await expect(page.getByText(t.save_changes_error, { exact: true })).toBeVisible();
  await expect(page.getByText('ERROR ESPAÑOL AL GUARDAR', { exact: true })).toHaveCount(0);

  await expect.poll(() => page.evaluate(() => document.documentElement.dir))
    .toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
  await expectNoOverflow(page);
}
async function runScenario(page, lang, viewport) {
  await loadFilterOptionLanguage(lang);
  await page.setViewportSize(viewport);
  await mockApi(page);
  await installSession(page, lang);
  await assertPostFlow(page, lang);
  await assertEditFlow(page, lang);
}

for (const lang of LANGUAGES) {
  test(`post and edit localization render ${lang} on desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await runScenario(page, lang, { width: 1440, height: 900 });
  });
}

for (const lang of LANGUAGES) {
  test(`post and edit localization render ${lang} on mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await runScenario(page, lang, { width: 390, height: 844 });
  });
}
