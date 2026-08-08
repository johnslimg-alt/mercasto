import test from 'node:test';
import assert from 'node:assert/strict';
import { appendDynamicFilters, parseDynamicFilters } from '../src/utils/filterUrlState.js';

test('serializes scalar, array, and generic range dynamic filters', () => {
  const params = new URLSearchParams();
  appendDynamicFilters(params, {
    marca: 'Honda',
    transmision: ['Manual', 'Automática'],
    year: { min: '2022', max: '2026' },
  });
  assert.equal(params.get('filters[marca]'), 'Honda');
  assert.deepEqual(params.getAll('filters[transmision][]'), ['Manual', 'Automática']);
  assert.equal(params.get('filters[year][min]'), '2022');
  assert.equal(params.get('filters[year][max]'), '2026');
});

test('restores dynamic filters from a shareable URL', () => {
  const params = new URLSearchParams('filters%5Bmarca%5D=Honda&filters%5Btransmision%5D%5B%5D=Manual&filters%5Btransmision%5D%5B%5D=Autom%C3%A1tica&filters%5Byear%5D%5Bmin%5D=2022&filters%5Byear%5D%5Bmax%5D=2026');
  assert.deepEqual(parseDynamicFilters(params), {
    marca: 'Honda',
    transmision: ['Manual', 'Automática'],
    year: { min: '2022', max: '2026' },
  });
});

test('canonical catalog filters serialize without empty values or duplicate array entries', () => {
  const params = appendDynamicFilters(new URLSearchParams(), {
    sort: 'price_asc',
    listing_type: ['Venta', 'Renta', 'Venta'],
    precio: { min: '100', max: '900', ignored: '' },
    empty: '',
  });
  assert.deepEqual(params.getAll('filters[listing_type][]'), ['Venta', 'Renta']);
  assert.equal(params.get('filters[precio][min]'), '100');
  assert.equal(params.get('filters[precio][max]'), '900');
  assert.equal(params.get('filters[sort]'), 'price_asc');
  assert.equal(params.has('filters[empty]'), false);
});

test('rejects unsafe filter keys while parsing and serializing', () => {
  const params = appendDynamicFilters(new URLSearchParams(), {
    valid_key: 'ok',
    'invalid[key]': 'blocked',
  });
  params.set('filters[valid_key]', 'ok');
  params.set('filters[bad key]', 'blocked');
  assert.deepEqual(parseDynamicFilters(params), { valid_key: 'ok' });
});
