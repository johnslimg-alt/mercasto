import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { HOME_FAQ_LANGUAGES, HOME_FAQ_COPY, getHomeFaqCopy } from '../src/utils/homeFaqCopy.js';
import { loadFilterOptionLanguage } from '../src/utils/filterOptionTranslations.js';
import { getVerticalCardMeta } from '../src/utils/verticalCardMeta.js';
import { HOME_MAP_LANGUAGES, HOME_MAP_COPY, formatHomePropertiesLabel } from '../src/utils/homeMapCopy.js';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const grid = fs.readFileSync('src/components/verticals/VerticalAdGrid.jsx', 'utf8');
const productsLanding = fs.readFileSync('src/components/screens/verticals/ProductosLanding.jsx', 'utf8');
const itemList = fs.readFileSync('src/components/seo/ItemListSchema.jsx', 'utf8');
const faqSchema = fs.readFileSync('src/components/seo/FAQSchema.jsx', 'utf8');
const home = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');
const adDetail = fs.readFileSync('src/components/screens/AdDetailScreen.jsx', 'utf8');
const push = fs.readFileSync('src/components/ui/PushNotificationManager.jsx', 'utf8');
const toast = fs.readFileSync('src/components/ui/Toast.jsx', 'utf8');
const cookieBanner = fs.readFileSync('src/components/CookieBanner.jsx', 'utf8');
const pricingModal = fs.readFileSync('src/components/modals/PricingModal.jsx', 'utf8');

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}
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

test('push notification UI and feedback use canonical localization keys while preserving API calls', async () => {
  const keys = ['push_notification_not_ready', 'push_notification_permission_denied', 'push_notification_unsupported', 'push_notification_enabled', 'push_notification_save_error', 'push_notification_enable_error', 'push_notification_disabled', 'push_notification_disable_error', 'push_notification_test_sent', 'push_notification_test_error', 'push_notification_blocked_title', 'push_notification_blocked_desc', 'push_notification_enabled_title', 'push_notification_enabled_desc', 'push_notification_send_test', 'push_notification_enable_title', 'push_notification_enable_desc', 'push_notification_enabling'];
  const spanish = await translationsFor('es');
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of keys) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
    assert.match(t.push_notification_test_sent, /\{count\}/, `${lang}.push_notification_test_sent`);
    if (lang !== 'es') assert.notEqual(t.push_notification_enable_title, spanish.push_notification_enable_title, `${lang}.push_notification_enable_title`);
  }
  const spanishPush = keys.map((key) => spanish[key]).join(' ');
  assert.equal(spanishPush.includes(String.fromCharCode(0xbf)), false);
  assert.equal(spanishPush.includes(String.fromCharCode(0xa1)), false);
  for (const literal of ['Permiso denegado', 'Notificaciones activadas!', 'Error al guardar suscripción', 'Notificaciones desactivadas', 'Notificaciones bloqueadas', 'Activa las notificaciones']) {
    assert.equal(push.includes(literal), false, literal);
  }
  assert.equal(push.includes('getPushNotificationCopy'), false);
  assert.equal(fs.existsSync('src/utils/pushNotificationCopy.js'), false);
  assert.match(push, /push_notification_enable_title/);
  assert.match(dashboard, /<PushNotificationManager user=\{user\} compact=\{false\} lang=\{lang\} \/>/);
  assert.match(push, /fetch\(`\$\{API_BASE\}\/push\/subscribe`,[\s\S]*?method: 'POST'/);
  assert.match(push, /fetch\(`\$\{API_BASE\}\/push\/unsubscribe`,[\s\S]*?method: 'POST'/);
  assert.match(push, /fetch\(`\$\{API_BASE\}\/push\/test`,[\s\S]*?method: 'POST'/);
});


test('global toast close control follows active locale instead of hardcoded Spanish', async () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    assert.ok(String(t.close_btn || t.close || '').trim(), `${lang}.close`);
  }
  assert.equal(toast.includes('aria-label="Cerrar"'), false);
  assert.match(toast, /const \{ lang \} = useUI\(\)/);
  assert.match(toast, /const t = getTranslations\(lang\)/);
  assert.match(toast, /aria-label=\{closeLabel\}/);
});


test('global cookie consent banner uses canonical localized copy without Spanish fallbacks', async () => {
  const keys = ['cookies_aria_label', 'close_btn', 'cookies_title', 'cookies_desc', 'learn_more', 'cookies_essential', 'cookies_accept_all'];
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of keys) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
  }
  for (const literal of ['Aviso de cookies', 'Cerrar', 'Usamos cookies para mejorar tu experiencia.', 'Más información', 'Solo esenciales', 'Aceptar todas']) {
    assert.equal(cookieBanner.includes(literal), false, literal);
  }
  assert.match(cookieBanner, /aria-label=\{dictionary\.cookies_aria_label\}/);
  assert.match(cookieBanner, /aria-label=\{dictionary\.close_btn\}/);
  assert.match(cookieBanner, /localStorage\.setItem\('cookie_consent', 'all'\)/);
  assert.match(cookieBanner, /localStorage\.setItem\('cookie_consent', 'essential'\)/);
});


test('auth recovery back-to-login control follows active locale', async () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    assert.ok(String(t.auth_back_to_login || '').trim(), `${lang}.auth_back_to_login`);
  }
  assert.equal(app.includes('Volver a iniciar sesión'), false);
  assert.match(app, /\{t\.auth_back_to_login\}/);
});


test('global App shell uses guaranteed localization keys without fallback literals', async () => {
  const keys = ['search', 'notifications', 'search_placeholder', 'search_placeholder_short', 'search_btn', 'all_mexico', 'state', 'city', 'cancel', 'apply', 'language', 'close_btn', 'ai_brand_tagline', 'ai_brand_short'];
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of keys) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
  }
  for (const fallback of [
    "t.search || 'Buscar'", "t.notifications || 'Notificaciones'", "t.search_btn || 'Buscar'",
    "t.language || 'Idioma'", "t.all_mexico || 'Todo México'", "t.state || 'Estado'",
    "t.city || 'Ciudad'", "t.cancel || 'Cerrar'", "t.apply || 'Aplicar'", "t.close_btn || 'Cerrar'",
    "t.ai_brand_tagline || 'La plataforma de clasificados más moderna e inteligente con AI'",
    "t.ai_brand_short || t.ai_brand_tagline || 'AI classifieds'",
  ]) assert.equal(app.includes(fallback), false, fallback);
  assert.match(app, /placeholder=\{t\.search_placeholder\}/);
  assert.match(app, /placeholder=\{t\.search_placeholder_short\}/);
});

test('pricing modal uses guaranteed localization keys without fallback literals', async () => {
  const keys = [...new Set([...pricingModal.matchAll(/(?<![A-Za-z0-9_])t\.([A-Za-z0-9_]+)/g)].map((match) => match[1]))];
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of keys) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
  }
  assert.doesNotMatch(pricingModal, /t\.[A-Za-z0-9_]+\s*\|\|/);
  for (const productCode of ['boost_1_day', 'boost_3_days', 'highlight_7_days', 'featured_7_days', 'featured_30_days', 'top_category_7_days']) {
    assert.ok(pricingModal.includes(`'${productCode}'`), productCode);
  }
  for (const price of [19, 49, 79, 149, 399]) assert.ok(pricingModal.includes(`handlePromotionProductPayment(${price},`), `promotion ${price}`);
});
