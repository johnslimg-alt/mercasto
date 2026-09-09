import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalizeFilterOptionSelection,
  filterOptionLabel,
  loadFilterOptionLanguage,
} from '../src/utils/filterOptionTranslations.js';

const options = [
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
];

test('runtime option labels normalize to canonical values', () => {
  assert.equal(canonicalizeFilterOptionSelection(options, 'Casa'), 'casa');
  assert.equal(canonicalizeFilterOptionSelection(options, ' casa '), 'casa');
  assert.equal(canonicalizeFilterOptionSelection(options, 'departamento'), 'departamento');
  assert.equal(canonicalizeFilterOptionSelection(options, 'Otro'), 'Otro');
});

test('runtime option normalization supports persisted arrays', () => {
  assert.deepEqual(
    canonicalizeFilterOptionSelection(options, ['Casa', 'departamento', 'Otro']),
    ['casa', 'departamento', 'Otro'],
  );
});

test('canonical database values keep user-facing labels', async () => {
  assert.equal(filterOptionLabel('property_type', 'casa', 'es'), 'Casa');
  assert.equal(filterOptionLabel('contract_type', 'autonomo', 'es'), 'Freelance');
  assert.equal(filterOptionLabel('working_hours', 'completa', 'es'), 'Tiempo completo');
  assert.equal(filterOptionLabel('fuel', 'electrico', 'es'), 'Eléctrico');

  await loadFilterOptionLanguage('en');
  assert.equal(filterOptionLabel('property_type', 'casa', 'en'), 'House');
  assert.equal(filterOptionLabel('contract_type', 'autonomo', 'en'), 'Freelance');
  assert.equal(filterOptionLabel('working_hours', 'completa', 'en'), 'Full time');
  assert.equal(filterOptionLabel('fuel', 'electrico', 'en'), 'Electric');
});
