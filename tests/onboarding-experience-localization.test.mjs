import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { ONBOARDING_EXPERIENCE_COPY } from '../src/utils/onboardingExperienceCopy.js';

const ROLES = ['buyer', 'seller', 'both'];
const INTERESTS = ['motor', 'inmobiliaria', 'empleo', 'servicios', 'tecnologia', 'hogar', 'moda', 'deportes', 'mascotas'];

function numericFacts(text) {
  return text.match(/\d+/g)?.map(Number).sort((a, b) => a - b) || [];
}

test('onboarding experience covers exactly the 11 active languages', () => {
  assert.deepEqual(Object.keys(ONBOARDING_EXPERIENCE_COPY), SUPPORTED_LANGUAGES);
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);
});

test('every onboarding locale preserves the complete experience shape', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const copy = ONBOARDING_EXPERIENCE_COPY[lang];
    assert.deepEqual(Object.keys(copy.roles), ROLES, `${lang}.roles`);
    assert.deepEqual(Object.keys(copy.interests), INTERESTS, `${lang}.interests`);
    assert.deepEqual(Object.keys(copy.howTitle), ROLES, `${lang}.howTitle`);
    assert.deepEqual(Object.keys(copy.how), ROLES, `${lang}.how`);
    assert.deepEqual(Object.keys(copy.cta), ROLES, `${lang}.cta`);
    assert.equal(copy.welcomeChips.length, 5, `${lang}.welcomeChips`);
    assert.match(copy.selectedCount, /\{count\}/, `${lang}.selectedCount`);
    for (const role of ROLES) {
      assert.equal(copy.roles[role].length, 2, `${lang}.roles.${role}`);
      assert.equal(copy.how[role].length, 3, `${lang}.how.${role}`);
      assert.equal(copy.cta[role].length, 2, `${lang}.cta.${role}`);
      for (const step of copy.how[role]) assert.equal(step.length, 2, `${lang}.how.${role}.step`);
    }
  }
});

test('pricing facts remain 0 MXN / 7 days and 49 MXN / 7 days in every language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const copy = ONBOARDING_EXPERIENCE_COPY[lang];
    assert.deepEqual(numericFacts(copy.pricingFree), [0, 7], `${lang}.free pricing facts`);
    assert.deepEqual(numericFacts(copy.pricingRenew), [7, 49], `${lang}.renew pricing facts`);
    assert.match(`${copy.pricingFree} ${copy.pricingRenew}`, /MXN/, `${lang}.MXN`);
  }
});

test('Mexico Spanish onboarding copy follows closing-only punctuation policy', () => {
  const serialized = JSON.stringify(ONBOARDING_EXPERIENCE_COPY.es);
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});
test('OnboardingModal consumes localized experience copy without former Spanish runtime literals', () => {
  const source = fs.readFileSync('src/components/OnboardingModal.jsx', 'utf8');
  for (const marker of [
    'getOnboardingExperienceCopy(lang)', 'experience.roleTitle', 'experience.interestsTitle',
    'experience.howTitle', 'experience.how[roleKey]', 'experience.pricingFree',
    'experience.pricingRenew', 'experience.buyerMapTip', 'experience.sellerAiTip',
    'experience.profileNotificationsTip', 'experience.selectedCount', 'experience.cta[roleKey]',
    'dictionary.saving_word', 'dictionary.back', 'dictionary.next_btn',
  ]) assert.ok(source.includes(marker), marker);
  for (const former of [
    'Qué quieres hacer?', 'Personalizaremos tu experiencia', 'Qué te interesa?',
    'Cómo comprar en Mercasto?', 'Cómo vender en Mercasto?', 'En 3 simples pasos',
    'Explora clasificados por categoría y publica lo que quieres vender en México.',
    'Primera activación elegible: 0 MXN por 7 días',
    'Después puedes renovar por 49 MXN por 7 días adicionales.',
    'Esta selección es opcional y puedes cambiarla después',
    '/9 seleccionadas', 'Usa el mapa para encontrar anuncios cerca de ti',
    'La IA te ayuda a escribir descripciones atractivas', 'Activa notificaciones para nuevos anuncios',
    "'Guardando…'", '> Anterior', "'Finalizar'", "'Siguiente'", 'aria-label="Cerrar"',
  ]) assert.equal(source.includes(former), false, former);
});

test('onboarding preference payload, persistence and completion routes stay unchanged', () => {
  const source = fs.readFileSync('src/components/OnboardingModal.jsx', 'utf8');
  assert.match(source, /preferred_role: selectedRole \|\| null/);
  assert.match(source, /preferred_categories: selectedInterests/);
  assert.match(source, /onboarding_resolution: resolution/);
  assert.match(source, /localStorage\.setItem\('onboarding_role', selectedRole\)/);
  assert.match(source, /localStorage\.setItem\('onboarding_interests', JSON\.stringify\(selectedInterests\)\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/user\/preferences`,[\s\S]*?method: 'POST'/);
  assert.match(source, /onboarding_pending_sync/);
  assert.match(source, /if \(selectedRole === 'buyer'\) \{\s*navigate\('\/listings'\)/);
  assert.match(source, /else \{\s*navigate\('\/post'\)/);
});
