import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const smoke = fs.readFileSync('scripts/category-data-smoke.sh', 'utf8');

test('category readiness blocks retired slugs across production data surfaces', () => {
  for (const legacy of ['coches', 'telefonos', 'telefonia', 'informatica', 'bebes', 'coleccionismo']) {
    assert.ok(smoke.includes(`"${legacy}"`), `missing legacy guard for ${legacy}`);
  }

  for (const check of [
    'legacy_categories_absent',
    'canonical_categories_present',
    'legacy_ads_absent',
    'legacy_category_subscriptions_absent',
    'legacy_search_alerts_absent',
  ]) {
    assert.ok(smoke.includes(`$checks["${check}"]`), `missing readiness check ${check}`);
  }

  assert.match(smoke, /whereIn\("slug", \$legacySlugs\)/);
  assert.match(smoke, /whereIn\("category", \$legacySlugs\)/);
  assert.match(smoke, /whereIn\("category_slug", \$legacySlugs\)/);
});

test('category readiness requires all canonical aliases to resolve', () => {
  for (const canonical of ['motor', 'electronica', 'infantil', 'ocio']) {
    assert.ok(smoke.includes(`"${canonical}"`), `missing canonical category ${canonical}`);
  }

  assert.match(smoke, /\$canonicalCategoryCount === count\(\$canonicalSlugs\)/);
});
