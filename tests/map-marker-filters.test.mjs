import test from 'node:test';
import assert from 'node:assert/strict';
import { markerMatchesMapFilters } from '../src/utils/mapMarkerFilters.js';

const completeMarker = {
  id: 1,
  coords: [25.6866, -100.3161],
  approximate: false,
  label: '$325,000',
  ad: {
    title: { es: 'Toyota Corolla' },
    price: 325000,
    state: 'Nuevo León',
    city: 'Monterrey',
    category: 'coches',
    listing_type: 'Venta',
    condition: 'nuevo',
    attributes: { carroceria: 'Sedán', transmision: 'Automática' },
  },
};

const fullFilters = {
  query: 'corolla',
  minPrice: 100000,
  maxPrice: 450000,
  onlyWithCoords: true,
  state: 'Nuevo León',
  city: 'Monterrey',
  category: 'coches',
  listingType: 'Venta',
  condition: ['nuevo'],
  dynamic: { carroceria: ['Sedán'] },
};

test('accepts a marker that satisfies the complete map filter contract', () => {
  assert.equal(markerMatchesMapFilters(completeMarker, fullFilters), true);
});

test('rejects markers missing a field required by an active canonical filter', () => {
  const cases = [
    ['state', { state: undefined }, { state: 'Nuevo León' }],
    ['city', { city: undefined }, { city: 'Monterrey' }],
    ['category', { category: undefined }, { category: 'coches' }],
    ['listing type', { listing_type: undefined }, { listingType: 'Venta' }],
    ['condition', { condition: undefined }, { condition: ['nuevo'] }],
  ];

  for (const [label, adPatch, filterPatch] of cases) {
    const marker = { ...completeMarker, ad: { ...completeMarker.ad, ...adPatch } };
    assert.equal(markerMatchesMapFilters(marker, filterPatch), false, label);
  }
});

test('rejects missing category-specific attributes instead of leaving stale markers visible', () => {
  const marker = {
    ...completeMarker,
    ad: { ...completeMarker.ad, attributes: {} },
  };
  assert.equal(markerMatchesMapFilters(marker, { dynamic: { carroceria: ['Sedán'] } }), false);
});

test('rejects markers without a numeric price when a price filter is active', () => {
  const marker = {
    ...completeMarker,
    label: 'Consultar',
    ad: { ...completeMarker.ad, price: null },
  };
  assert.equal(markerMatchesMapFilters(marker, { maxPrice: 450000 }), false);
});

test('normalizes case for canonical scalar filters while keeping dynamic values exact', () => {
  assert.equal(markerMatchesMapFilters(completeMarker, {
    state: 'nuevo león',
    city: 'MONTERREY',
    category: 'COCHES',
    listingType: 'venta',
    condition: ['NUEVO'],
  }), true);
  assert.equal(markerMatchesMapFilters(completeMarker, { dynamic: { carroceria: ['sedán'] } }), false);
});
