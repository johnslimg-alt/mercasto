import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('HomeScreen delegates the three low-risk discovery sections', () => {
  const home = read('src/components/screens/HomeScreen.jsx');
  assert.match(home, /<PopularSearchesSection t=\{t\} runSearch=\{runSearch\} \/>/);
  assert.match(home, /<CitiesSection[\s\S]*?applyCityFilter=\{applyCityFilter\}/);
  assert.match(home, /<NewsletterSection t=\{t\} showHomeToast=\{showHomeToast\} \/>/);
});

test('extracted sections preserve search, city and newsletter behavior', () => {
  const sections = read('src/components/home/HomeDiscoverySections.jsx');
  assert.match(sections, /href=\{`\/listings\?q=\$\{encodeURIComponent\(term\)\}`\}/);
  assert.match(sections, /runSearch\(term\)/);
  assert.match(sections, /href=\{`\/listings\?location=\$\{encodeURIComponent\(city\.name\)\}`\}/);
  assert.match(sections, /applyCityFilter\(city\.name\)/);
  assert.match(sections, /onViewAllMexico\(\)/);
  assert.match(sections, /showHomeToast\(t\.newsletter_subscribed_toast\)/);
  assert.match(sections, /e\.target\.reset\(\)/);
});


test('home interaction feedback is explicit in every active language', async () => {
  const required = ['upload_cv_available_toast', 'job_alert_saved_toast', 'newsletter_subscribed_toast'];
  const spanish = (await import('../src/constants/translations/es.js')).default;
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = (await import(`../src/constants/translations/${lang}.js`)).default;
    for (const key of required) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
    if (lang !== 'es') {
      for (const key of required) assert.notEqual(t[key], spanish[key], `${lang}.${key}`);
    }
  }

  const home = read('src/components/screens/HomeScreen.jsx');
  const sections = read('src/components/home/HomeDiscoverySections.jsx');
  assert.match(home, /showHomeToast\(t\.upload_cv_available_toast\)/);
  assert.match(home, /showHomeToast\(t\.job_alert_saved_toast\)/);
  assert.match(sections, /showHomeToast\(t\.newsletter_subscribed_toast\)/);
  for (const stale of [
    'La carga de CV estará disponible desde tu panel de usuario.',
    'Alerta de empleo guardada para esta búsqueda.',
    'Gracias por suscribirte.',
  ]) {
    assert.equal(home.includes(stale) || sections.includes(stale), false, stale);
  }
});
