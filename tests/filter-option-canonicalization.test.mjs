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

test('canonical database values keep user-facing labels for canonical and legacy keys', async () => {
  assert.equal(filterOptionLabel('property_type', 'casa', 'es'), 'Casa');
  assert.equal(filterOptionLabel('tipo', 'casa', 'es'), 'Casa');
  assert.equal(filterOptionLabel('property_type', 'bodega', 'es'), 'Bodega');
  assert.equal(filterOptionLabel('contract_type', 'autonomo', 'es'), 'Freelance');
  assert.equal(filterOptionLabel('contrato', 'indefinido', 'es'), 'Indefinido');
  assert.equal(filterOptionLabel('working_hours', 'completa', 'es'), 'Tiempo completo');
  assert.equal(filterOptionLabel('tipo_empleo', 'completa', 'es'), 'Tiempo completo');
  assert.equal(filterOptionLabel('tipo_empleo', 'autonomo', 'es'), 'Freelance');
  assert.equal(filterOptionLabel('fuel', 'electrico', 'es'), 'Eléctrico');
  assert.equal(filterOptionLabel('combustible', 'electrico', 'es'), 'Eléctrico');

  await loadFilterOptionLanguage('en');
  assert.equal(filterOptionLabel('property_type', 'casa', 'en'), 'House');
  assert.equal(filterOptionLabel('tipo', 'casa', 'en'), 'House');
  assert.equal(filterOptionLabel('property_type', 'bodega', 'en'), 'Warehouse');
  assert.equal(filterOptionLabel('contract_type', 'autonomo', 'en'), 'Freelance');
  assert.equal(filterOptionLabel('contrato', 'indefinido', 'en'), 'Permanent');
  assert.equal(filterOptionLabel('working_hours', 'completa', 'en'), 'Full time');
  assert.equal(filterOptionLabel('tipo_empleo', 'completa', 'en'), 'Full time');
  assert.equal(filterOptionLabel('tipo_empleo', 'autonomo', 'en'), 'Freelance');
  assert.equal(filterOptionLabel('fuel', 'electrico', 'en'), 'Electric');
  assert.equal(filterOptionLabel('combustible', 'electrico', 'en'), 'Electric');
});
