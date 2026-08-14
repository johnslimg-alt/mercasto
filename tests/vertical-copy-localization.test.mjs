import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import {
  VERTICAL_KEYS,
  getVerticalCopy,
  getVerticalLandingCopy,
  hasCompleteVerticalCoverage,
  hasVerticalCopyLanguage,
} from '../src/utils/verticalCopy.js';

test('every active language has explicit copy for every vertical', () => {
  assert.equal(hasCompleteVerticalCoverage(), true);
  for (const vertical of VERTICAL_KEYS) {
    for (const lang of SUPPORTED_LANGUAGES) {
      assert.equal(hasVerticalCopyLanguage(vertical, lang), true, `${vertical}/${lang}`);
      const copy = getVerticalCopy(lang, vertical);
      for (const key of ['title', 'subtitle', 'placeholder', 'featured']) {
        assert.equal(typeof copy[key], 'string', `${vertical}/${lang}/${key}`);
        assert.ok(copy[key].trim().length > 0, `${vertical}/${lang}/${key}`);
      }
    }
  }
});

test('products and tourism landing copy covers every active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const products = getVerticalLandingCopy(lang, 'productos');
    assert.equal(products.sectionLabels.length, 7, `productos/${lang}/sections`);
    assert.ok(products.sectionLabels.every(Boolean), `productos/${lang}/labels`);
    assert.ok(products.exploreTitle && products.guideTitle && products.guideBody, `productos/${lang}/ui`);

    const tourism = getVerticalLandingCopy(lang, 'turismo');
    for (const key of ['hospedaje', 'tours', 'boletos_turismo', 'articulos_camping', 'souvenirs', 'guias_servicios', 'atracciones_exp', 'retiros_bienestar']) {
      assert.ok(tourism.sectionLabels[key], `turismo/${lang}/${key}`);
    }
    assert.ok(tourism.transportRental && tourism.exploreTitle && tourism.viewAll && tourism.mapTitle && tourism.mapDescription, `turismo/${lang}/ui`);
  }
});

test('archived languages do not masquerade as explicit vertical copy', () => {
  assert.equal(hasVerticalCopyLanguage('productos', 'he'), false);
  assert.equal(hasVerticalCopyLanguage('turismo', 'yi'), false);
});
