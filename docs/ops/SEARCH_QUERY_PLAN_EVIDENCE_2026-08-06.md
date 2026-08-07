# Search Query Plan Evidence — 2026-08-06

## Scope and safety

This is an aggregate-only, read-only production audit for issue #501. No row, index, extension, configuration or embedding was changed while collecting these plans.

Environment:

- PostgreSQL 18.4;
- `pg_trgm` installed;
- 5,905 ads in the audited table plan;
- 5,678 active ads: 1 genuine listing and 5,677 catalog references;
- warm-cache `EXPLAIN (ANALYZE, BUFFERS)` on the production VPS.

## Representative plans

| Path | Plan | Execution time | Result |
|---|---|---:|---|
| Old combined keyword + fuzzy fallback for `casa` | sequential scan | 40.280 ms | 322 matches |
| Exact-first `ILIKE` title/description for `casa` | sequential scan selected by planner | 15.179 ms | 322 matches |
| Title suggestion `title ILIKE '%casa%'` | bitmap index scan on `ads_title_trgm_idx` | 0.927 ms | limited to 6 |
| Typo fallback `title %> 'motocicleta'` | bitmap index scan on `ads_title_trgm_idx` | 2.773 ms | 29 matches |

The common exact term remains selective enough for the planner to prefer a sequential scan, but stays below the 20 ms target. Suggestions and typo fallback use the existing trigram index.

## Canonical search paths

- `/api/ads?search=` is the deterministic public catalog keyword path. It performs no external embedding request and reads no vector column.
- `/api/search/semantic` is the canonical semantic path. Its canonical storage is `embeddings.embedding`, using `embeddings_embedding_index` (HNSW).
- Semantic embedding generation is skipped when there is no active genuine embedding coverage; the endpoint falls back to keyword/fuzzy search.
- Catalog reference embeddings remain excluded from genuine semantic results.

Current aggregate vector inventory:

- active genuine ads: 1;
- active genuine rows in `embeddings`: 0;
- active catalog rows in `embeddings`: 682;
- active rows with legacy `ads.embedding`: 682;
- total rows in `embeddings`: 715.

## Deferred destructive cleanup

`ads.embedding` still has both IVFFlat (`ads_embedding_idx`) and HNSW (`ads_embedding_index`) indexes and remains referenced by legacy similar-listing code. This change does not drop either index, delete embeddings or rewrite vectors.

Before cleanup, a follow-up must provide a count-only dependency map, reversible data mapping, backup evidence and explicit approval. The current PR only removes the legacy vector/provider dependency from ordinary public catalog search.
