import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildListingDuplicateFingerprint,
  evaluateListingQuality,
} from '../src/utils/listingQualityPreflight.js';

test('valid marketplace listing passes hard validation without warnings', () => {
  const result = evaluateListingQuality({
    category: 'electronica',
    title: 'iPhone 15 Pro 256 GB',
    description: 'Equipo en excelente estado, batería cuidada, incluye caja y cable original.',
    price: 18500,
    imageCount: 4,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.hardErrors, []);
  assert.deepEqual(result.warnings, []);
});

test('missing required basics are hard errors while quality remains non-destructive', () => {
  const result = evaluateListingQuality({ category: '', title: '', description: '', price: '' });

  assert.equal(result.ok, false);
  assert.deepEqual(result.hardErrors.sort(), [
    'category_required',
    'description_required',
    'price_required',
    'title_required',
  ]);
});

test('low-quality product copy returns warnings instead of destructive actions', () => {
  const result = evaluateListingQuality({
    category: 'productos',
    title: 'aaaaa',
    description: 'oferta oferta oferta oferta oferta oferta oferta oferta',
    price: 0,
    imageCount: 0,
  });

  assert.equal(result.ok, true);
  assert.ok(result.warnings.includes('title_too_short'));
  assert.ok(result.warnings.includes('description_too_short'));
  assert.ok(result.warnings.includes('price_zero_or_negative'));
  assert.ok(result.warnings.includes('photo_recommended'));
  assert.ok(result.warnings.includes('keyword_stuffing'));
  assert.ok(result.warnings.includes('placeholder_like_title'));
  assert.equal('delete' in result, false);
  assert.equal('block' in result, false);
});

test('structured contact data copied into listing text is signalled', () => {
  const result = evaluateListingQuality({
    category: 'hogar',
    title: 'Mesa de madera sólida',
    description: 'Mesa para comedor en buen estado. Escríbeme al +52 229 123 4567 o mira https://example.com.',
    price: 2500,
    imageCount: 2,
  });

  assert.ok(result.warnings.includes('contact_in_copy'));
  assert.ok(result.warnings.includes('url_in_copy'));
});

test('category policy avoids irrelevant photo and zero-price warnings for jobs', () => {
  const result = evaluateListingQuality({
    category: 'empleo',
    title: 'Ayudante administrativo',
    description: 'Vacante de tiempo completo con horario de lunes a viernes y capacitación incluida.',
    price: 0,
    imageCount: 0,
  });

  assert.equal(result.ok, true);
  assert.equal(result.warnings.includes('photo_recommended'), false);
  assert.equal(result.warnings.includes('price_zero_or_negative'), false);
});

test('quality evaluation is language-independent and keeps stable signal codes', () => {
  const spanish = evaluateListingQuality({
    category: 'electronica',
    title: 'TV',
    description: 'Buen estado',
    price: 500,
    imageCount: 0,
  });
  const english = evaluateListingQuality({
    category: 'electronica',
    title: 'TV',
    description: 'Good condition',
    price: 500,
    imageCount: 0,
  });

  assert.deepEqual(spanish.hardErrors, english.hardErrors);
  assert.ok(spanish.warnings.includes('title_too_short'));
  assert.ok(english.warnings.includes('title_too_short'));
  assert.ok(spanish.warnings.includes('photo_recommended'));
  assert.ok(english.warnings.includes('photo_recommended'));
});

test('duplicate fingerprint is stable across spacing, punctuation and media order', () => {
  const first = buildListingDuplicateFingerprint({
    sellerId: 42,
    title: 'Bicicleta Trek Marlin 5',
    location: 'Boca del Río, Veracruz',
    mediaHashes: ['BBB', 'aaa'],
  });
  const second = buildListingDuplicateFingerprint({
    sellerId: '42',
    title: '  Bicicleta   Trek Marlin 5!!! ',
    location: 'Boca del Rio Veracruz',
    mediaHashes: ['AAA', 'bbb'],
  });

  assert.equal(first, second);
});
