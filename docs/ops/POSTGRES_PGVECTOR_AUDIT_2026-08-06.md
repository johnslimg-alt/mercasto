# PostgreSQL and pgvector production audit — 2026-08-06

Issue: #13

Audit mode: read-only production review.

Audited production checkout: `e2513180f46879d9364e1890c30b3403d705df20`.

Repository baseline used for this report: `29e3189e06831af411549cae4d734d6504b2e8a5`.

Audit window: 2026-08-06 23:13–23:26 UTC.

## Safety statement

The audit executed catalog queries, aggregate counts, `EXPLAIN ANALYZE` on bounded `SELECT` statements, migration-status checks, backup-list checks and log-signal counts.

It did not execute migrations, `ANALYZE`, `VACUUM`, DDL, data updates, deletes, restores, configuration reloads or container restarts. No row values containing emails, IP addresses, tokens or payment payloads were printed.

## Executive decision

**Controlled soft launch: database PASS with tracked follow-ups.**

**Broad paid/unrestricted scale: database NO-GO until true off-host backup #500 is complete.**

Search/vector performance #501 and privacy retention #504 are P1 scale/readiness work. Observability/index hygiene #502 and unmanaged schema drift #505 must be resolved before the database footprint grows materially.

## Healthy production signals

- PostgreSQL `18.4`; `vector 0.8.2`; `pg_trgm 1.6`.
- Database size: 103,577,279 bytes, approximately 99 MiB.
- Database container: healthy, running since 2026-06-22, zero restarts, zero OOM kills.
- Current activity: one database connection, zero waiting locks, zero idle-in-transaction sessions, no long transaction.
- Seven-day logs before the audit: zero deadlocks, statement timeouts, PANIC or out-of-memory events.
- All repository migrations report `Ran`; no pending migration.
- No invalid or not-ready public index was found.
- XID ages are far below wraparound-risk thresholds.
- Latest custom-format backup is fresh, non-empty and readable by `pg_restore -l`.
- Public API, production smoke and the full server `verify_quick` gate were green during the surrounding launch window.

## Configuration snapshot

| Setting | Value | Audit interpretation |
|---|---:|---|
| `max_connections` | 100 | Current utilization is minimal; no immediate pooler requirement. |
| `shared_buffers` | 128 MiB | Adequate for the current ~99 MiB database; remeasure with growth. |
| `effective_cache_size` | 4 GiB | Reasonable planner hint on the current host. |
| `work_mem` | 4 MiB | No sort spill was observed in sampled plans. |
| `maintenance_work_mem` | 64 MiB | Sufficient for current small maintenance tasks. |
| `autovacuum` | on | Healthy globally, but table-level effectiveness needs monitoring. |
| `track_io_timing` | off | Observability gap tracked in #502. |
| `log_min_duration_statement` | disabled | Observability gap tracked in #502. |
| `pg_stat_statements` | absent | No normalized historical query ranking; tracked in #502. |

## Data and storage inventory

| Table | Actual rows | Approximate total size | Notes |
|---|---:|---:|---|
| `real_estate_developments` | 144,593 | 16.0 MiB | Unmanaged production-only table; see #505. |
| `ad_moderation_decisions` | 29,846 | 13.5 MiB | Fast-growing audit/AI decision history. |
| `ad_impressions` | 14,798 | 3.8 MiB | Contains IP addresses; retention tracked in #504. |
| `ads` | 5,905 | 45.1 MiB | About 8.4 MiB heap and 33.7 MiB indexes. |
| `ad_views` | 2,995 | 1.2 MiB | Telemetry retention tracked in #504. |
| `personal_access_tokens` | 918 | 0.5 MiB | No expired token at audit time. |
| `embeddings` | 715 | 5.8 MiB | Mostly vector index/TOAST footprint. |
| `users` | 205 | 0.4 MiB | Current connection/load is low. |
| `payments` | 32 | 0.2 MiB | Provider payload minimization already active. |

The ads table has 1,170 estimated dead tuples versus 5,905 live tuples. This is not a capacity emergency, but heap visibility is already causing 1,394 heap fetches in an otherwise index-only active-count plan.

`real_estate_developments` is more serious than its original zero-row planner estimate suggested. It has 144,593 actual rows, no analyze history, only a primary-key index, no code/migration reference, no triggers or view dependencies, and 146 duplicate composite records. It is tracked separately in #505.

## Index inventory findings

- `ads_geo_index` and `ads_latitude_longitude_index` are identical B-tree indexes on `(latitude, longitude)`.
- `ads.embedding` has both IVFFlat and HNSW cosine indexes.
- The separate `embeddings.embedding` column has another HNSW cosine index.
- Twenty-one foreign keys have no leading child index.
- Most unindexed foreign keys are currently on empty or small tables; immediate blanket index creation is not justified.
- The highest-growth unindexed child reference is `ad_moderation_decisions.moderator_id` on a 29,846-row table.

## Measured query plans

All execution times below are warm-cache, single-run audit measurements and are not load-test percentiles.

| Query shape | Plan | Execution time | Assessment |
|---|---|---:|---|
| Active listing count | `idx_ads_status` index-only scan | 2.7 ms | Good; dead tuples reduce index-only efficiency. |
| Latest promoted feed | sequential scan + top-N sort | 7.4 ms | Acceptable now and cached; rework before large growth. |
| Motor latest feed | backward scan on `ads_feed_index` | 0.09 ms | Good. |
| Indexed title/description `ILIKE` | GIN trigram bitmap scan | 9.1 ms | Good baseline. |
| Actual keyword fallback | sequential scan + similarity sort | 41.9 ms | P1 query-plan issue #501. |
| Title suggestions | sequential scan + distinct sort | 5.3 ms | Small now; grows linearly. |
| Exact state filter using `ILIKE` | sequential scan | 3.9 ms | Current B-tree state index cannot serve this expression. |
| City/location contains filter | sequential scan | 7.2 ms | Normalize/exact-match or add measured trigram support later. |
| Motor price range | price index scan + filter | 0.75 ms | Good at current selectivity. |
| 50 km radius | coordinate bitmap scan + Haversine filter | 12.5 ms | Acceptable now; B-tree is not a true spatial index. |
| `ads.embedding` nearest neighbor | IVFFlat scan | 177.7 ms | Poor for only 715 vectors; consolidation required. |
| Genuine semantic join | sequential vector filter + join | 33.6 ms, zero rows | Catalog vectors are doing work without genuine coverage. |

The current search fallback uses `LOWER(title) LIKE`, `LOWER(description) LIKE`, and `similarity(LOWER(title), ...)` in one `OR`. This shape does not use the existing GIN trigram indexes on the original columns. Prefer an indexed exact-first phase and execute fuzzy similarity only when exact results are insufficient.

The latest-feed expression includes time-dependent boost rules, so a simple expression index is not appropriate. At current scale the cached 7.4 ms plan is acceptable. A future design should materialize stable rank state or split promoted/default branches rather than creating a speculative index.

## pgvector readiness

Current coverage:

- 5,905 ads total;
- 715 rows have `ads.embedding`;
- 715 rows exist in the separate `embeddings` table;
- 1 active genuine listing;
- 0 active genuine listings have an embedding;
- 682 active catalog references have embeddings.

Semantic search is correctly treated as an optional enhancement with keyword fallback, input bounds and genuine-only result filtering. It is not ready to become a release dependency or a source of genuine marketplace supply.

The immediate action is not a new vector index. First choose one canonical storage/update path, remove redundant generation paths through a dry run, and obtain representative genuine embedding coverage. Then compare HNSW and IVFFlat with the actual dimension, row count, recall target and write rate. This work is tracked in #501.

## Backup and restore audit

- Freshness gate: pass with maximum age 30 hours.
- Latest artifact at audit time: approximately 8.26 MB.
- `pg_restore -l`: pass, 631 archive TOC entries.
- Primary backup directory: approximately 119 MB.
- Directory named `mercasto-offsite`: approximately 938 MB and seven current dump files.
- Free filesystem space: approximately 57 GB.
- Existing non-production restore drill and rollback runbooks are present.

Critical topology finding: both backup directories resolve through `findmnt` to the same `/dev/sda1` ext4 filesystem. The second directory is a local duplicate, not off-host disaster recovery. True remote replication and restore-from-remote evidence are tracked in #500.

## Retention and privacy signals

Only aggregate counts were inspected:

- all 14,798 ad impressions contain IP addresses;
- 3,091 impression IP records are older than 30 days;
- 81 ad views are older than 30 days;
- 244 user notifications are older than 30 days, including 241 unread rows;
- all 29,846 moderation decisions contain metadata, about 0.97 MB total;
- 918 personal access tokens exist; none were expired and 28 had never been used;
- payment payload storage is small after the provider-payload minimization migration.

No table-by-table retention matrix or approved pruning schedule was found. Privacy/legal classification and bounded dry-run-first pruning are tracked in #504. Payment, refund and audit evidence must not be included in automatic short-term deletion without legal/business approval.

## Log and runtime signals

Before the audit began, the seven-day PostgreSQL log contained 31 `ERROR` and one `FATAL` record. Pattern counts overlap: nine duplicate-key messages, twelve missing-relation messages, eleven constraint-violation messages, one syntax error and one permission error.

There were no statement timeouts, deadlocks, vector-dimension errors, transaction-aborted cascades, PANIC, OOM or terminated-connection signals. The audit did not print statements or parameter values. Without normalized query telemetry and application correlation, the remaining errors cannot be safely classified as unique production incidents; observability work is tracked in #502.

## Recommended index and query policy

No production index is approved for immediate creation or removal by this report.

1. Rewrite keyword search to use the existing trigram-compatible exact path before considering expression indexes.
2. Observe index usage over a representative window before dropping one duplicate coordinate index.
3. Consolidate vector storage and benchmark one ANN method per canonical vector column before removing any vector index.
4. Review child indexes first for `ad_moderation_decisions.moderator_id`, messages, payments, reports and push subscriptions.
5. Use `CREATE INDEX CONCURRENTLY` and `DROP INDEX CONCURRENTLY` only after backup, lock-risk and rollback review.
6. Do not add another B-tree for `%ILIKE%` location search. Normalize locations for equality or benchmark trigram/PostGIS plans first.
7. Keep the current Haversine path while it remains near the measured 12.5 ms; move to a geography/GiST model only with documented radius-query volume and growth.
8. Refresh planner statistics in an approved maintenance step for unmanaged or materially changed tables; do not use `VACUUM FULL` as routine maintenance.

## Restore checklist

1. Confirm the newest local dump is non-empty and within the approved RPO.
2. Verify its SHA-256 manifest and `pg_restore -l` output.
3. Confirm the remote replica is in a separate failure domain.
4. Download a remote artifact and verify the checksum again.
5. Restore only into a disposable database/container first.
6. Confirm required extensions, migrations, core table counts and schema constraints.
7. Run category, search, security and production-equivalent smoke tests against the disposable target.
8. Record RTO, RPO, warnings and manual steps.
9. Destroy the disposable target after evidence is retained.
10. Never combine code rollback with an unreviewed database restore.

## Follow-up issues

| Issue | Priority | Required outcome |
|---|---|---|
| #500 | P1 launch blocker | Encrypted true off-host replication and remote restore drill. |
| #501 | P1 | Indexed exact-first keyword search and one canonical vector path. |
| #502 | P2 | Normalized query telemetry, lock/vacuum monitoring and evidence-based index maintenance. |
| #504 | P1 | Approved privacy-safe retention matrix and bounded pruning. |
| #505 | P1 | Adopt or safely retire unmanaged `real_estate_developments`. |

## Risk matrix

| Risk | Impact | Current likelihood | Decision |
|---|---|---|---|
| Production and both backup directories lost with one disk/VPS | Critical | Plausible | P1 blocker #500 before broad scale. |
| Keyword/vector path grows linearly or uses redundant ANN structures | High | Increasing with data | P1 #501. |
| Raw telemetry/IP retained without an approved schedule | High privacy/compliance | Present | P1 #504. |
| Unmanaged 144k-row table cannot be recreated from migrations | High recovery/ownership | Present | P1 #505. |
| Slow-query and index decisions lack normalized history | Medium | Present | P2 #502. |
| Current core listing queries exceed launch latency | High | Low at current scale | Not reproduced. |
| Lock, connection, XID, OOM or migration instability | High | Low | Not reproduced. |

## Final audit result

The current PostgreSQL service is operationally healthy for controlled soft launch: migrations are complete, the container is stable, hot listing paths are fast enough at current volume, local backups are fresh and readable, and semantic search fails safely to keyword search.

The audit does not approve broad paid scaling because disaster recovery still shares the production disk. It also does not approve speculative index changes, mass vector cleanup, retention deletion or removal of the unmanaged table. Those actions require the linked issues, current backups, dry-run evidence and explicit approval where stated.

## Reproduction commands

- `docker exec mercasto_backend_container php artisan migrate:status --no-ansi`
- `REQUIRE_BACKUP_FRESHNESS=1 MAX_BACKUP_AGE_HOURS=30 bash scripts/backup-freshness-smoke.sh`
- read-only PostgreSQL catalog queries from `pg_stat_*`, `pg_indexes`, `pg_constraint` and `information_schema`;
- bounded `EXPLAIN (ANALYZE, BUFFERS, WAL, SUMMARY)` inside `BEGIN READ ONLY` with a 15-second statement timeout;
- `findmnt` for backup failure-domain verification;
- `pg_restore -l` for archive readability.
