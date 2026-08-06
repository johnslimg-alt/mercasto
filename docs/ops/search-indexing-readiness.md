# Search and indexing readiness

## Runtime architecture

Mercasto does not run Meilisearch or another public search daemon. The public search surfaces are:

- `GET /api/ads?search=...`: primary database-backed listing search;
- `GET /api/search/suggestions?q=...`: cached title/category/location/brand suggestions;
- `GET /api/search/semantic?search=...` (also accepts `q`): optional semantic search;
- `GET /api/ads/{id}/similar`: optional vector-based related listings.

Ollama is an internal Docker service and has no host-published port. PostgreSQL provides `vector` and `pg_trgm`; neither creates a new public network surface.

## Failure policy

Semantic search is an enhancement, not a release dependency.

1. Queries shorter than two characters return a controlled empty JSON response.
2. Query input is bounded to 100 characters and protected by the shared search rate limiter.
3. Ollama, embedding-table, vector-extension or vector-query failures fall back to keyword search.
4. Semantic candidates must be genuine active listings and have cosine distance at or below `0.35`.
5. If no vector candidate passes that threshold, keyword search is used.
6. Keyword search uses `pg_trgm` only when PostgreSQL reports the extension as installed; otherwise it remains a portable `LIKE` search.

## Production snapshot — 2026-08-06 UTC

- `/api/ads?page=1`: HTTP 200;
- `/api/categories`: HTTP 200;
- `/api/search/suggestions?q=bici`: HTTP 200;
- PostgreSQL extensions: `vector`, `pg_trgm`;
- Ollama container: healthy and internal-only;
- existing `embeddings` rows: 715 total, 682 linked to active listings;
- active genuine listings with rows in the legacy embeddings table: 0.

Because the existing vector rows were catalog references, semantic relevance was not suitable as a release gate. The endpoint now falls back instead of returning distant catalog vectors.

## Safe embedding backfill

New or changed ads dispatch the unique queued `GenerateAdEmbedding` job after commit. For a controlled bulk backfill:

```bash
cd /var/www/mercasto
docker exec mercasto_backend_container php artisan mercasto:generate-embeddings --dry-run
docker exec mercasto_backend_container php artisan mercasto:generate-embeddings --limit=50
```

The command targets genuine active listings by default. `--include-catalog` is an explicit opt-in and is not part of the normal production procedure.

Before and after a batch, record coverage without changing data:

```sql
SELECT
  count(*) FILTER (WHERE status = 'active' AND NOT is_catalog_filler) AS active_genuine,
  count(*) FILTER (WHERE status = 'active' AND NOT is_catalog_filler AND embedding IS NOT NULL) AS genuine_with_embedding
FROM ads;
```

Run small batches, keep the worker and Ollama healthy, and verify public `/api/ads`, suggestions and semantic fallback after each batch. Do not make semantic coverage a launch blocker until genuine coverage and representative relevance checks are documented.
