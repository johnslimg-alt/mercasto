# Vector storage consolidation evidence — 2026-08-07

## Pre-change production mapping

Count-only comparison of the two existing stores showed:

- `ads.embedding`: 715 populated rows;
- `embeddings.embedding`: 715 populated rows;
- rows present in both stores: 715;
- exact vector equality: 715;
- differing vectors: 0;
- rows present in only one store: 0.

Active semantic coverage at the same point:

- genuine active listings with canonical embeddings: 0;
- active catalog-reference listings with canonical embeddings: 682.

ANN indexes before any cleanup:

- `ads_embedding_idx`: IVFFlat on legacy `ads.embedding`, 208 recorded scans;
- `ads_embedding_index`: HNSW on legacy `ads.embedding`, 0 recorded scans;
- `embeddings_embedding_index`: HNSW on canonical `embeddings.embedding`, 0 recorded scans while genuine coverage is zero.

## Runtime consolidation in this change

This change moves all remaining runtime readers/writers to `embeddings.embedding`:

- `SemanticSearchService` search, generation, backfill, coverage and similar-listing paths;
- the queued `GenerateAdEmbedding` observer path through that service;
- the `mercasto:generate-embeddings` command;
- public `/api/ads/{id}/similar`;
- dormant Advanced AI embedding status reporting;
- the old duplicated `AdController::index` search path no longer calls a remote embedding API or ranks by the legacy column.

Semantic queries continue to exclude `is_catalog_filler=true` listings. With zero current genuine vector coverage, the public semantic and similar-listing paths continue to use their existing deterministic fallbacks instead of returning catalog vectors as genuine supply.

## Destructive cleanup deliberately deferred

No vector row, legacy column, IVFFlat index or HNSW index is removed here. `ads.embedding` remains an exact rollback shadow while the canonical path accumulates a clean usage window. A later cleanup may be considered only after:

1. off-host backup/restore evidence is fresh;
2. canonical genuine coverage and query plans are recorded;
3. runtime/static scans show no legacy consumer;
4. an index-usage window justifies the exact drop target;
5. the destructive change is explicitly approved and uses reversible, bounded steps.
