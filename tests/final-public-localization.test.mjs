import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { HOME_FAQ_LANGUAGES, HOME_FAQ_COPY, getHomeFaqCopy } from '../src/utils/homeFaqCopy.js';
import { loadFilterOptionLanguage } from '../src/utils/filterOptionTranslations.js';
import { getVerticalCardMeta } from '../src/utils/verticalCardMeta.js';
import { HOME_MAP_LANGUAGES, HOME_MAP_COPY, formatHomePropertiesLabel } from '../src/utils/homeMapCopy.js';
import { PUSH_NOTIFICATION_LANGUAGES, PUSH_NOTIFICATION_COPY } from '../src/utils/pushNotificationCopy.js';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const grid = fs.readFileSync('src/components/verticals/VerticalAdGrid.jsx', 'utf8');
const productsLanding = fs.readFileSync('src/components/screens/verticals/ProductosLanding.jsx', 'utf8');
const itemList = fs.readFileSync('src/components/seo/ItemListSchema.jsx', 'utf8');
const faqSchema = fs.readFileSync('src/components/seo/FAQSchema.jsx', 'utf8');
const home = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');
const adDetail = fs.readFileSync('src/components/screens/AdDetailScreen.jsx', 'utf8');
const push = fs.readFileSync('src/components/ui/PushNotificationManager.jsx', 'utf8');
const dashboard = fs.readFileSync('src/components/screens/UserDashboard.jsx', 'utf8');

test('home FAQ copy covers exactly the 11 active languages', () => {
  assert.deepEqual(HOME_FAQ_LANGUAGES, SUPPORTED_LANGUAGES);
  assert.equal(HOME_FAQ_LANGUAGES.includes('he'), false);
  assert.equal(HOME_FAQ_LANGUAGES.includes('yi'), false);
  for (const lang of SUPPORTED_LANGUAGES) {
    const copy = getHomeFaqCopy(lang);
    assert.equal(copy.length, 6, `${lang} FAQ count`);
    for (const faq of copy) {
      assert.ok(faq.question.trim(), `${lang} question`);
      assert.ok(faq.answer.trim(), `${lang} answer`);
    }
    assert.match(copy[2].answer, /49\s*MXN/, `${lang} renewal price`);
  }
});

test('non-Spanish home FAQs do not fall back to Spanish', () => {
  const spanish = HOME_FAQ_COPY.es;
  for (const lang of SUPPORTED_LANGUAGES.filter(code => code !== 'es')) {
    const copy = HOME_FAQ_COPY[lang];
    assert.notEqual(copy[0].question, spanish[0].question, `${lang} first question`);
    assert.notEqual(copy[0].answer, spanish[0].answer, `${lang} first answer`);
    assert.notEqual(copy[1].question, spanish[1].question, `${lang} AI question`);
  }
});

test('Mexico Spanish FAQ follows closing-only punctuation', () => {
  const serialized = JSON.stringify(HOME_FAQ_COPY.es);
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('FAQ and ItemList schemas consume the active language', () => {
  assert.match(faqSchema, /getHomeFaqCopy\(currentLang\)/);
  assert.equal(faqSchema.includes('HOME_FAQS_ES'), false);
  assert.equal(faqSchema.includes('Cómo comprar'), false);
  assert.match(itemList, /localizedText\(item\.title, lang\)/);
  assert.match(itemList, /localizedText\(item\.description, lang\)/);
  assert.match(itemList, /\[items, listName, lang\]/);
});

test('vertical grids receive lang and format public values by locale', () => {
  assert.match(grid, /formatNumber\(ad\.price, lang\)/);
  assert.match(grid, /localizedText\(ad\.title, lang\)/);
  assert.match(grid, /getVerticalCardMeta\(ad, variant, lang\)/);
  assert.equal(grid.includes("toLocaleString('es-MX')"), false);
  assert.equal(grid.includes("viewAllLabel = 'Ver todos"), false);

  for (const file of ['AutosLanding', 'InmueblesLanding', 'EmpleosLanding', 'ServiciosLanding', 'TurismoLanding', 'CategoryLanding', 'ProductosLanding']) {
    const source = fs.readFileSync(`src/components/screens/verticals/${file}.jsx`, 'utf8');
    assert.match(source, /<VerticalAdGrid[\s\S]*?lang=\{lang\}[\s\S]*?\/>/, file);
  }
  assert.match(productsLanding, /apiUrls=\{SUBSECTIONS\.map\(sub => `\$\{API_URL\}\/ads\?category=\$\{sub\.query\}&per_page=2`\)\}/);
  assert.equal(productsLanding.includes('category=productos'), false);
  assert.match(grid, /const apiUrlKey = Array\.isArray\(apiUrls\)/);
  assert.match(grid, /seen\.has\(ad\.id\)/);
});

test('vertical card metadata localizes known canonical attributes', async () => {
  await loadFilterOptionLanguage('en');
  const auto = getVerticalCardMeta({
    attributes: { marca: 'Toyota', modelo: 'RAV4', year: 2021, km: '65000', combustible: 'Híbrido' },
  }, 'autos', 'en');
  assert.deepEqual(auto.primary, ['Toyota', 'RAV4', '2021']);
  assert.deepEqual(auto.secondary, ['65,000 km', 'Hybrid']);

  const service = getVerticalCardMeta({
    attributes: { tipo: 'Hogar', modalidad: 'A domicilio', experiencia_servicio: '4-7 años', tipo_cobro: 'Por visita' },
  }, 'services', 'en');
  assert.deepEqual(service.primary, ['Home', 'At home']);
  assert.deepEqual(service.secondary, ['4-7 years', 'Per visit']);
});

test('export and Clip feedback no longer leak hardcoded Spanish while request contracts stay unchanged', () => {
  assert.equal(app.includes('Error al obtener datos del backend'), false);
  assert.equal(app.includes("toLocaleString('es-MX')} Créditos Mercasto"), false);
  assert.match(app, /showToast\(t\.connection_error, 'error'\)/);
  assert.match(app, /localizeServerMessage\(lang, data\.message, t\.payment_error_generating\)/);
  assert.match(app, /formatNumber\(numericAmount, lang\).*t\.pm_credits_unit/);
  assert.match(app, /fetch\(`\$\{API_URL\}\/payment\/clip`,[\s\S]*?method: 'POST',[\s\S]*?JSON\.stringify\(\{ amount, description, ad_id: adId, product_code: productCode \}\)/);
});


test('home real-estate map copy covers all active languages without Spanish runtime literals', () => {
  assert.deepEqual(HOME_MAP_LANGUAGES, SUPPORTED_LANGUAGES);
  assert.equal(formatHomePropertiesLabel('en', 'Jalisco'), 'Properties in Jalisco');
  assert.equal(formatHomePropertiesLabel('es', 'Jalisco'), 'Propiedades en Jalisco');
  for (const lang of SUPPORTED_LANGUAGES) {
    const copy = HOME_MAP_COPY[lang];
    assert.ok(copy.loading && copy.propertiesAll && copy.propertiesIn.includes('{state}'), lang);
  }
  assert.equal(home.includes('Cargando mapa de propiedades...'), false);
  assert.equal(home.includes('Propiedades en todo México'), false);
  assert.equal(home.includes("toLocaleString('es-MX')"), false);
  assert.match(home, /formatHomePropertiesLabel\(lang, selectedState\)/);
  assert.match(home, /formatNumber\(value, lang\)/);
});

test('owner ad controls and price history follow active locale without changing mutation endpoints', () => {
  for (const literal of ['Error al pausar', 'Error al reactivar', '> Pausar<', '> Reactivar<', 'Anuncio en Mercasto']) {
    assert.equal(adDetail.includes(literal), false, literal);
  }
  assert.equal(adDetail.includes("toLocaleString('es-MX')"), false);
  assert.equal(adDetail.includes("toLocaleDateString('es-MX'"), false);
  assert.match(adDetail, /OwnerControls[\s\S]*?t, lang/);
  assert.match(adDetail, /\{t\.pause\}/);
  assert.match(adDetail, /\{t\.reactivate\}/);
  assert.match(adDetail, /formatNumber\(tooltip\.price, lang\)/);
  assert.match(adDetail, /formatDate\(tooltip\.date, lang,/);
  assert.match(adDetail, /fetch\(`\$\{API_URL\}\/ads\/\$\{ad\.id\}\/pause`,[\s\S]*?method: 'PUT'/);
  assert.match(adDetail, /fetch\(`\$\{API_URL\}\/ads\/\$\{ad\.id\}\/activate`,[\s\S]*?method: 'PUT'/);
});

test('push notification UI and feedback cover all active languages while preserving API calls', () => {
  assert.deepEqual(PUSH_NOTIFICATION_LANGUAGES, SUPPORTED_LANGUAGES);
  const spanish = PUSH_NOTIFICATION_COPY.es;
  for (const lang of SUPPORTED_LANGUAGES) {
    const copy = PUSH_NOTIFICATION_COPY[lang];
    for (const key of ['notReady', 'permissionDenied', 'unsupported', 'enabled', 'saveError', 'enableError', 'disabled', 'disableError', 'testSent', 'testError', 'blockedTitle', 'blockedDesc', 'enabledTitle', 'enabledDesc', 'sendTest', 'enableTitle', 'enableDesc', 'enabling']) {
      assert.ok(String(copy[key] || '').trim(), `${lang}.${key}`);
    }
    assert.match(copy.testSent, /\{count\}/, `${lang}.testSent`);
    if (lang !== 'es') assert.notEqual(copy.enableTitle, spanish.enableTitle, `${lang}.enableTitle`);
  }
  assert.equal(JSON.stringify(spanish).includes(String.fromCharCode(0xbf)), false);
  assert.equal(JSON.stringify(spanish).includes(String.fromCharCode(0xa1)), false);
  for (const literal of ['Permiso denegado', 'Notificaciones activadas!', 'Error al guardar suscripción', 'Notificaciones desactivadas', 'Notificaciones bloqueadas', 'Activa las notificaciones']) {
    assert.equal(push.includes(literal), false, literal);
  }
  assert.match(push, /getPushNotificationCopy\(lang\)/);
  assert.match(dashboard, /<PushNotificationManager user=\{user\} compact=\{false\} lang=\{lang\} \/>/);
  assert.match(push, /fetch\(`\$\{API_BASE\}\/push\/subscribe`,[\s\S]*?method: 'POST'/);
  assert.match(push, /fetch\(`\$\{API_BASE\}\/push\/unsubscribe`,[\s\S]*?method: 'POST'/);
  assert.match(push, /fetch\(`\$\{API_BASE\}\/push\/test`,[\s\S]*?method: 'POST'/);
});
