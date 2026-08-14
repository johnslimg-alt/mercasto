import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { CONTACT_PAGE_LANGUAGES, CONTACT_SUBJECT_VALUES, getContactPageCopy, getContactSubjects, hasContactPageCopy } from '../src/utils/contactPageCopy.js';
import { getPublicSeo } from '../src/constants/publicSeo.js';

const REQUIRED = [
  'seoTitle','seoDescription','breadcrumb','title','subtitle','formTitle','successTitle','successMessage','genericError',
  'name','namePlaceholder','email','emailPlaceholder','subject','subjectPlaceholder','message','messagePlaceholder','sending','send',
  'emailCardTitle','emailCardSub','responseTitle','responseValue','responseSub','followUs','faqTitle','faqBody','faqLink',
  'nameRequired','emailRequired','emailInvalid','subjectRequired','messageRequired','messageMin',
];

test('contact page explicitly covers every active language', () => {
  assert.deepEqual([...CONTACT_PAGE_LANGUAGES].sort(), [...SUPPORTED_LANGUAGES].sort());
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(hasContactPageCopy(lang), true, lang);
    const copy = getContactPageCopy(lang);
    for (const key of REQUIRED) assert.ok(String(copy[key] || '').trim(), `${lang}.${key}`);
    assert.equal(copy.subjects.length, CONTACT_SUBJECT_VALUES.length, `${lang}.subjects`);
  }
  assert.equal(hasContactPageCopy('he'), false);
  assert.equal(hasContactPageCopy('yi'), false);
});

test('translated subject labels preserve canonical backend values', () => {
  assert.deepEqual(CONTACT_SUBJECT_VALUES, ['Reporte de anuncio','Problema técnico','Sugerencia','Otro']);
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.deepEqual(getContactSubjects(lang).map(item => item.value), CONTACT_SUBJECT_VALUES, lang);
  }
});

test('contact metadata follows the active language and removes fixed response SLA', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const copy = getContactPageCopy(lang);
    assert.deepEqual(getPublicSeo('/contacto', lang), { title: copy.seoTitle, description: copy.seoDescription });
  }
  const screen = fs.readFileSync('src/components/screens/ContactoScreen.jsx', 'utf8');
  assert.equal(screen.includes('Menos de 24 horas'), false);
  assert.equal(screen.includes("data.message || 'Mensaje recibido"), false);
});
