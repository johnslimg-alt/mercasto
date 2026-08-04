import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSavedSearchSelection } from '../src/utils/savedSearchSelection.js';

test('saved search selection supplies explicit filters to the next request', () => {
  assert.deepEqual(normalizeSavedSearchSelection({
    query: ' bicicleta ',
    category: 'productos',
    state: 'Jalisco',
    min_price: 1000,
    max_price: 5000,
  }), {
    query: 'bicicleta',
    category: 'productos',
    state: 'Jalisco',
    minPrice: '1000',
    maxPrice: '5000',
  });
});

test('saved search selection tolerates missing and legacy city fields', () => {
  assert.deepEqual(normalizeSavedSearchSelection({ city: 'Mérida' }), {
    query: '',
    category: '',
    state: 'Mérida',
    minPrice: '',
    maxPrice: '',
  });
});
