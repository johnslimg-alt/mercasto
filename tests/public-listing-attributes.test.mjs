import test from 'node:test';
import assert from 'node:assert/strict';
import { publicListingAttributeEntries } from '../src/utils/publicListingAttributes.js';

test('public listing attributes keep seller-facing values and reject catalog/editorial metadata', () => {
  const entries = publicListingAttributeEntries({
    tipo: 'Cubreauto',
    material: 'Poliéster impermeable',
    ajuste: 'Sedán',
    editorial_reference: true,
    catalog_template_key: 'motor-cover',
    catalog_cover_key: 'reference-6341',
    catalog_image_semantic_key: 'car_cover',
    catalog_image_source: 'curated-local',
  });

  assert.deepEqual(Object.fromEntries(entries), {
    tipo: 'Cubreauto',
    material: 'Poliéster impermeable',
    ajuste: 'Sedán',
  });
});

test('public listing attributes safely handle malformed and empty data', () => {
  assert.deepEqual(publicListingAttributeEntries(null), []);
  assert.deepEqual(publicListingAttributeEntries([]), []);
  assert.deepEqual(publicListingAttributeEntries({ material: '', ajuste: null, tipo: undefined }), []);
});
