import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalizeFilterOptionSelection } from '../src/utils/filterOptionTranslations.js';

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
