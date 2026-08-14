import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { HELP_CENTER_LANGUAGES, getHelpCenterCopy, hasHelpCenterCopy } from '../src/utils/helpCenterCopy.js';
import { getPublicSeo } from '../src/constants/publicSeo.js';

const SECTION_IDS = ['publicar', 'comprar', 'cuenta', 'seguridad', 'destacar'];
const FAQ_COUNTS = [4, 3, 3, 3, 3];
const SHELL_KEYS = ['seoTitle', 'seoDescription', 'breadcrumb', 'heroTitle', 'heroSubtitle', 'searchPlaceholder', 'noResults', 'tryOther', 'clearSearch', 'contactTitle', 'contactBody', 'contactButton'];

test('help center explicitly covers every active language with the same FAQ structure', () => {
  assert.deepEqual([...HELP_CENTER_LANGUAGES].sort(), [...SUPPORTED_LANGUAGES].sort());
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(hasHelpCenterCopy(lang), true, lang);
    const copy = getHelpCenterCopy(lang);
    for (const key of SHELL_KEYS) assert.ok(String(copy[key] || '').trim(), `${lang}.${key}`);
    assert.deepEqual(copy.sections.map(section => section.id), SECTION_IDS, `${lang}.section ids`);
    assert.deepEqual(copy.sections.map(section => section.faqs.length), FAQ_COUNTS, `${lang}.faq counts`);
    for (const section of copy.sections) {
      assert.ok(section.title.trim(), `${lang}.${section.id}.title`);
      for (const faq of section.faqs) {
        assert.ok(faq.q.trim(), `${lang}.${section.id}.question`);
        assert.ok(faq.a.trim(), `${lang}.${section.id}.answer`);
      }
    }
  }
  assert.equal(hasHelpCenterCopy('he'), false);
  assert.equal(hasHelpCenterCopy('yi'), false);
});

test('help metadata follows the active language and commercial terms stay present', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const copy = getHelpCenterCopy(lang);
    assert.deepEqual(getPublicSeo('/ayuda', lang), { title: copy.seoTitle, description: copy.seoDescription });
    const promotionAnswer = copy.sections.find(section => section.id === 'destacar').faqs[1].a;
    for (const amount of ['$49 MXN', '$79 MXN', '$149 MXN', '$399 MXN']) assert.ok(promotionAnswer.includes(amount), `${lang}: ${amount}`);
    const durationAnswer = copy.sections.find(section => section.id === 'publicar').faqs[2].a;
    assert.ok(durationAnswer.includes('7'), `${lang}: listing duration`);
  }
});

test('Mexico Spanish help copy keeps the generated punctuation contract', () => {
  const serialized = JSON.stringify(getHelpCenterCopy('es'));
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('help screen consumes localized copy instead of the former Spanish FAQ block', () => {
  const screen = fs.readFileSync('src/components/screens/AyudaScreen.jsx', 'utf8');
  assert.match(screen, /getHelpCenterCopy\(lang\)/);
  assert.match(screen, /copy\.sections/);
  assert.equal(screen.includes("document.title = 'Centro de Ayuda | Mercasto'"), false);
  assert.equal(screen.includes('const SECTIONS = ['), false);
});
