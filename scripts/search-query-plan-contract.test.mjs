import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const controller = readFileSync('backend/app/Http/Controllers/Api/SearchController.php', 'utf8');
const catalogController = readFileSync('backend/app/Http/Controllers/Api/AdIndexController.php', 'utf8');
const migration = readFileSync(
  'backend/database/migrations/2026_06_10_000001_enable_pg_trgm_fuzzy_search.php',
  'utf8',
);

test('keyword search is exact-first and fuzzy work is index-supported', () => {
  assert.match(controller, /MIN_EXACT_KEYWORD_RESULTS = 3/);
  assert.match(controller, /caseInsensitiveContainsExpression\('ads\.title'\)/);
  assert.match(controller, /\? "\{\$column\} ILIKE \?"/);
  assert.doesNotMatch(controller, /LOWER\(title\) LIKE/);
  assert.doesNotMatch(controller, /similarity\(LOWER\(title\)/);

  const exactPagination = controller.indexOf('$exactResults = $exactQuery->paginate(16)');
  const fuzzyPredicate = controller.indexOf("ads.title %> ?");
  assert.ok(exactPagination >= 0 && fuzzyPredicate > exactPagination);
  assert.match(controller, /word_similarity\(\?, ads\.title\) DESC/);
});

test('suggestions use indexed title predicates before fuzzy fallback', () => {
  assert.match(controller, /suggestions:v2:/);
  assert.match(controller, /whereRaw\(\$titleLike, \[\$term\]\)/);
  assert.match(controller, /title %> \?/);
  assert.match(controller, /word_similarity\(\?, title\) AS sim/);
  assert.match(controller, /\$exact->count\(\) < self::MIN_EXACT_KEYWORD_RESULTS/);
});

test('semantic embedding work is gated by genuine listing coverage', () => {
  const coverageGate = controller.indexOf('if ($this->hasGenuineSemanticCoverage())');
  const embeddingRequest = controller.indexOf("Http::timeout(15)->post");
  assert.ok(coverageGate >= 0 && embeddingRequest > coverageGate);
  assert.match(controller, /join\('ads', 'ads\.id', '=', 'embeddings\.ad_id'\)/);
  assert.match(controller, /where\('ads\.is_catalog_filler', false\)/);
  assert.match(controller, /search:genuine_semantic_coverage/);
});

test('existing trigram indexes match the indexed query columns', () => {
  assert.match(migration, /ads USING GIN \(title gin_trgm_ops\)/);
  assert.match(migration, /ads USING GIN \(description gin_trgm_ops\)/);
});


test('public catalog search stays deterministic and bounded', () => {
  assert.match(catalogController, /validate\(\['search' => 'nullable\|string\|max:100'\]\)/);
  assert.match(catalogController, /caseInsensitiveContainsExpression\('title'\)/);
  assert.match(catalogController, /CASE WHEN \{\$titleLike\} THEN 0 ELSE 1 END/);
  assert.doesNotMatch(catalogController, /generativelanguage\.googleapis\.com/);
  assert.doesNotMatch(catalogController, /embedding <=>/);
  assert.doesNotMatch(catalogController, /Facades\\Http/);
});
