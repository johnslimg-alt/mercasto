import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const semantic = readFileSync('backend/app/Services/AI/SemanticSearchService.php', 'utf8');
const adController = readFileSync('backend/app/Http/Controllers/Api/AdController.php', 'utf8');
const command = readFileSync('backend/app/Console/Commands/GenerateEmbeddings.php', 'utf8');
const advanced = readFileSync('backend/app/Http/Controllers/Api/AI/AdvancedAIController.php', 'utf8');
const search = readFileSync('backend/app/Http/Controllers/Api/SearchController.php', 'utf8');
const routes = readFileSync('backend/routes/api.php', 'utf8');
const migration = readFileSync('backend/database/migrations/2026_06_09_000000_create_embeddings_table.php', 'utf8');

const runtime = [semantic, adController, command, advanced, search].join('\n');

test('canonical runtime vector storage is embeddings.embedding', () => {
  assert.match(semantic, /join\('embeddings', 'ads\.id', '=', 'embeddings\.ad_id'\)/);
  assert.match(semantic, /INSERT INTO embeddings \(ad_id, embedding, created_at, updated_at\)/);
  assert.match(semantic, /where\('ads\.is_catalog_filler', false\)/);
  assert.match(search, /embeddings\.embedding <=>/);
  assert.match(adController, /embeddings\.embedding <=>/);
  assert.match(command, /INSERT INTO embeddings \(ad_id, embedding, created_at, updated_at\)/);
  assert.match(advanced, /DB::table\('embeddings'\)/);
});

test('legacy ads.embedding has no runtime reader or writer', () => {
  assert.doesNotMatch(runtime, /UPDATE ads SET embedding/);
  assert.doesNotMatch(runtime, /ads\.embedding/);
  assert.doesNotMatch(runtime, /->embedding/);
  assert.doesNotMatch(runtime, /whereNotNull\('embedding'\)/);
  assert.doesNotMatch(runtime, /whereNull\('embedding'\)/);
  assert.doesNotMatch(adController, /generativelanguage\.googleapis\.com\/v1beta\/models\/text-embedding/);
});

test('public similar route stays live and canonical', () => {
  assert.match(routes, /get\('\/ads\/\{id\}\/similar', \[AdController::class, 'similar'\]\)/);
  assert.match(adController, /DB::table\('embeddings'\)[\s\S]*selectRaw\('embedding::text as embedding_text'\)/);
  assert.match(adController, /join\('embeddings', 'ads\.id', '=', 'embeddings\.ad_id'\)/);
});

test('canonical vector index remains HNSW on embeddings only', () => {
  assert.match(migration, /CREATE INDEX embeddings_embedding_index ON embeddings USING hnsw \(embedding vector_cosine_ops\)/);
});
