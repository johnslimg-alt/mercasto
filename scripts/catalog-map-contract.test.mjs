import test from 'node:test';
import assert from 'node:assert/strict';
import { getExactMapCoordinates } from '../src/utils/mapCoordinates.js';

test('accepts only exact valid coordinates', () => {
  assert.deepEqual(getExactMapCoordinates({ latitude: 19.4326, longitude: -99.1332 }), [19.4326, -99.1332]);
  assert.deepEqual(getExactMapCoordinates({ lat: '20.67', lng: '-103.35' }), [20.67, -103.35]);
});

test('rejects missing, zero, invalid and out-of-range coordinates', () => {
  for (const ad of [
    {},
    { latitude: null, longitude: null },
    { latitude: 0, longitude: -99 },
    { latitude: 19, longitude: 0 },
    { latitude: 'x', longitude: -99 },
    { latitude: 91, longitude: -99 },
    { latitude: 19, longitude: -181 },
  ]) {
    assert.equal(getExactMapCoordinates(ad), null);
  }
});
