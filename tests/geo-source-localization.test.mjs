import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import {
  GEO_SOURCE_LANGUAGES,
  GEO_SOURCE_PAGES,
  getGeoSourcePage,
  getGeoSourceShellCopy,
  hasGeoSourcePageLanguage,
} from '../src/content/geoSourcePages.js';

const SLUGS = [
  'como-funciona',
  'seguridad',
  'ayuda/publicar-anuncio',
  'ayuda/comprar-y-contactar',
  'tarifas',
  'sobre-mercasto',
];
const SHELL_KEYS = ['updatedLabel', 'faqTitle', 'relatedTitle', 'relatedBody', 'home'];

function collectNumbers(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, output);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (!['path', 'schemaType', 'href'].includes(key)) collectNumbers(item, output);
    }
  } else if (typeof value === 'string') {
    output.push(...(value.match(/\d+(?:[.,]\d+)?/g) || []));
  }
  return output;
}

test('GEO source pages explicitly cover exactly the 11 active languages', () => {
  assert.deepEqual([...GEO_SOURCE_LANGUAGES].sort(), [...SUPPORTED_LANGUAGES].sort());
  assert.equal(hasGeoSourcePageLanguage('he'), false);
  assert.equal(hasGeoSourcePageLanguage('yi'), false);

  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(hasGeoSourcePageLanguage(lang), true, lang);
    const shell = getGeoSourceShellCopy(lang);
    for (const key of SHELL_KEYS) assert.ok(String(shell[key] || '').trim(), `${lang}.${key}`);

    for (const slug of SLUGS) {
      const page = getGeoSourcePage(slug, lang);
      assert.ok(page, `${lang}.${slug}`);
      assert.equal(page.path, `/${slug}`);
      assert.ok(page.title.trim(), `${lang}.${slug}.title`);
      assert.ok(page.description.trim(), `${lang}.${slug}.description`);
      assert.ok(page.heading.trim(), `${lang}.${slug}.heading`);
      assert.ok(page.summary.trim(), `${lang}.${slug}.summary`);
      assert.equal(page.sections.length, 3, `${lang}.${slug}.sections`);
      assert.equal(page.faqs.length, 2, `${lang}.${slug}.faqs`);
      assert.equal(page.related.length, 4, `${lang}.${slug}.related`);
      for (const section of page.sections) {
        assert.ok(section.title.trim());
        assert.ok(section.body.trim());
        assert.ok(section.points.length >= 3);
        for (const point of section.points) assert.ok(point.trim());
      }
      for (const faq of page.faqs) {
        assert.ok(faq.question.trim());
        assert.ok(faq.answer.trim());
      }
      for (const item of page.related) {
        assert.ok(item.label.trim());
        assert.ok(item.href.startsWith('/'));
      }
    }
  }
});

test('localized GEO source copy preserves every numeric fact from Spanish', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    for (const slug of SLUGS) {
      const expectedNumbers = collectNumbers(GEO_SOURCE_PAGES[slug]);
      const localizedNumbers = collectNumbers(getGeoSourcePage(slug, lang));
      for (const number of expectedNumbers) {
        assert.ok(localizedNumbers.includes(number), `${lang}.${slug} keeps numeric fact ${number}`);
      }
    }
  }
});

test('pricing and transaction-safety invariants remain present in every language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const pricing = JSON.stringify(getGeoSourcePage('tarifas', lang));
    for (const amount of ['49', '79', '149', '399']) assert.ok(pricing.includes(amount), `${lang}: ${amount} MXN tier`);
    assert.ok(pricing.includes('7'), `${lang}: seven-day duration`);

    const buying = getGeoSourcePage('ayuda/comprar-y-contactar', lang);
    assert.ok(buying.sections[2].body.trim(), `${lang}: direct-transaction disclaimer`);
    const safety = getGeoSourcePage('seguridad', lang);
    assert.ok(safety.faqs[0].answer.trim(), `${lang}: no-guarantee answer`);
  }
});

test('Mexico Spanish GEO source copy follows closing-only punctuation contract', () => {
  const serialized = JSON.stringify({ pages: GEO_SOURCE_PAGES, shell: getGeoSourceShellCopy('es') });
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('GeoSourcePage consumes active language for copy and JSON-LD', () => {
  const screen = fs.readFileSync('src/components/screens/GeoSourcePage.jsx', 'utf8');
  assert.match(screen, /getGeoSourcePage\(slug, lang\)/);
  assert.match(screen, /getGeoSourceShellCopy\(lang\)/);
  assert.match(screen, /lang === 'es' \? 'es-MX' : lang/);
  assert.match(screen, /availableLanguage: \[schemaLanguage\]/);
  assert.equal(screen.includes("inLanguage: 'es-MX'"), false);
  assert.equal(screen.includes('Preguntas frecuentes</h2>'), false);
  assert.equal(screen.includes('Última actualización:'), false);

  const app = fs.readFileSync('src/App.jsx', 'utf8');
  assert.match(app, /const geoSourceOwnsSeo =/);
  assert.match(app, /const routeOwnsSeo = sellerProfileOwnsSeo \|\| geoSourceOwnsSeo \|\| routeSeoOwner === 'not-found'/);
  assert.match(app, /if \(!routeOwnsSeo\)/);
});
