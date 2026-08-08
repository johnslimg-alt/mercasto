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
    city: '',
    minPrice: '1000',
    maxPrice: '5000',
    condition: [],
    dynamicFilters: {},
  });
});

test('saved search selection tolerates missing and legacy city fields', () => {
  assert.deepEqual(normalizeSavedSearchSelection({ city: 'Mérida' }), {
    query: '',
    category: '',
    state: 'Mérida',
    city: 'Mérida',
    minPrice: '',
    maxPrice: '',
    condition: [],
    dynamicFilters: {},
  });
});


test('saved search selection preserves condition and dynamic filter state', () => {
  assert.deepEqual(normalizeSavedSearchSelection({
    query: ' corolla ',
    category: 'coches',
    state: 'Nuevo León',
    city: 'Monterrey',
    min_price: 100000,
    max_price: 450000,
    condition: ['nuevo', 'usado'],
    listing_type: ['Venta'],
    sort: 'price_desc',
    location_state: 'Nuevo León',
    location_city: 'Monterrey',
  }), {
    query: 'corolla',
    category: 'coches',
    state: 'Nuevo León',
    city: 'Monterrey',
    minPrice: '100000',
    maxPrice: '450000',
    condition: ['nuevo', 'usado'],
    dynamicFilters: {
      listing_type: ['Venta'],
      sort: 'price_desc',
      location_state: 'Nuevo León',
      location_city: 'Monterrey',
    },
  });
});

test('saved search selection accepts backend nested filters object', () => {
  assert.deepEqual(normalizeSavedSearchSelection({
    state: 'Jalisco',
    filters: {
      condition: ['usado'],
      payment_method: ['Efectivo'],
      sort: 'recent',
    },
  }), {
    query: '',
    category: '',
    state: 'Jalisco',
    city: '',
    minPrice: '',
    maxPrice: '',
    condition: ['usado'],
    dynamicFilters: { payment_method: ['Efectivo'], sort: 'recent' },
  });
});
