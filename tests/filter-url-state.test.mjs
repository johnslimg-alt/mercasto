import test from 'node:test';
import assert from 'node:assert/strict';
import { appendDynamicFilters, parseDynamicFilters } from '../src/utils/filterUrlState.js';

test('serializes scalar, array, and range dynamic filters', () => {
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