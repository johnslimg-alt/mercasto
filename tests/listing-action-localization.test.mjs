import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const REQUIRED_KEYS = [
  'listing_action_search_saved',
  'listing_action_search_save_error',
  'listing_action_ai_title_required',
  'listing_action_save_error',
  'listing_action_delete_error',
  'listing_action_bulk_success',
  'listing_action_bulk_error',
  'listing_action_activation_blocked',
  'listing_action_republish_success',
  'listing_action_republish_error',
  'listing_action_renew_success',
  'listing_action_renew_payment',
  'listing_action_renew_start_error',
  'listing_action_renew_error',
  'listing_action_report_sent',
  'listing_action_report_error',
  'listing_action_user_report_sent',
  'listing_action_share_text',
  'listing_action_existing_video',
  'listing_action_renewed',
];

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('listing action copy covers exactly the 11 active languages', async () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);

  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of REQUIRED_KEYS) {
      assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
    }
    assert.match(t.listing_action_renew_success, /\{date\}/, `${lang}.renew date placeholder`);
    assert.match(t.listing_action_share_text, /\{title\}/, `${lang}.share title placeholder`);
    assert.match(t.listing_action_republish_success, /7/, `${lang}.republish seven-day term`);
    assert.match(t.listing_action_share_text, /Mercasto/, `${lang}.share brand`);
  }
});

test('non-Spanish listing actions are localized rather than Spanish copies', async () => {
  const spanish = await translationsFor('es');
  for (const lang of SUPPORTED_LANGUAGES.filter(language => language !== 'es')) {
    const t = await translationsFor(lang);
    for (const key of [
      'listing_action_search_saved',
      'listing_action_republish_success',
      'listing_action_renew_success',
      'listing_action_report_sent',
      'listing_action_share_text',
    ]) {
      assert.notEqual(t[key], spanish[key], `${lang}.${key}`);
    }
  }
});

test('Mexico Spanish listing actions follow closing-only punctuation policy', async () => {
  const t = await translationsFor('es');
  const serialized = JSON.stringify(Object.fromEntries(REQUIRED_KEYS.map(key => [key, t[key]])));
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('App consumes localized listing actions and removes former Spanish runtime literals', () => {
  const source = fs.readFileSync('src/App.jsx', 'utf8');
  assert.match(source, /localizeServerMessage\(lang,/);
  assert.match(source, /formatDate\(data\.expires_at, lang,/);
  assert.match(source, /t\.listing_action_share_text\.replace\('\{title\}', adTitle\)/);
  assert.match(source, /t\.listing_action_renew_success\.replace\('\{date\}', newExpiry\)/);
  assert.match(source, /actionT\.listing_action_search_saved/);

  for (const formerLiteral of [
    'Búsqueda guardada. Te avisaremos de nuevos anuncios.',
    'No se pudo guardar la búsqueda',
    'Agrega un título primero para generar la descripción con IA.',
    'Selecciona la ubicación exacta tocando el mapa.',
    'Error al eliminar el anuncio.',
    'Video adjunto (Haz clic en la papelera para eliminar)',
    'Subida masiva completada',
    'Este anuncio está en revisión o fue rechazado y no puede ser activado manualmente.',
    'Anuncio republicado exitosamente! Estará activo 7 días más.',
    'Error de conexión al republicar.',
    'Error de conexión al renovar.',
    'Reporte enviado.',
    'Reporte de usuario enviado.',
    'Mira este anuncio en Mercasto:',
    'Enlace copiado al portapapeles!',
  ]) {
    assert.equal(source.includes(formerLiteral), false, formerLiteral);
  }
  assert.equal(source.includes("toLocaleDateString('es-MX'"), false);
});

test('listing action request and lifecycle contracts stay unchanged', () => {
  const source = fs.readFileSync('src/App.jsx', 'utf8');

  assert.match(source, /fetch\(`\$\{API_URL\}\/user\/search-alerts`,[\s\S]*?method: 'POST',[\s\S]*?query: searchQuery \|\| debouncedSearch \|\| '',[\s\S]*?filters: searchAlertFilters/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/ads\/generate-description`,[\s\S]*?method: 'POST',[\s\S]*?locale:[ \t]+lang/);
  assert.match(source, /formData\.append\('title', form\.title\)/);
  assert.match(source, /formData\.append\('price', form\.price\)/);
  assert.match(source, /formData\.append\('description', form\.description\)/);
  assert.match(source, /formData\.append\('latitude', form\.latitude\)/);
  assert.match(source, /formData\.append\('longitude', form\.longitude\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/ads\/\$\{ad\.id\}\/republish`,[\s\S]*?method: 'POST'/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/ads\/\$\{ad\.id\}\/renew`,[\s\S]*?method: 'PUT'/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/ads\/\$\{reportingAd\.id\}\/report`,[\s\S]*?body: JSON\.stringify\(reportForm\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/users\/\$\{viewedCompany\.id\}\/report`,[\s\S]*?body: JSON\.stringify\(userReportForm\)/);
  assert.match(source, /formData\.append\('file', file\)/);
});

test('user report checks HTTP success before showing the localized success message', () => {
  const source = fs.readFileSync('src/App.jsx', 'utf8');
  const start = source.indexOf('const handleUserReportSubmit');
  const end = source.indexOf('// --- ПОДЕЛИТЬСЯ ОБЪЯВЛЕНИЕМ ---', start);
  const block = source.slice(start, end);
  assert.match(block, /if \(!res\.ok\) \{/);
  assert.match(block, /listing_action_report_error/);
  assert.match(block, /listing_action_user_report_sent/);
  assert.ok(block.indexOf('if (!res.ok)') < block.indexOf('listing_action_user_report_sent'));
});
