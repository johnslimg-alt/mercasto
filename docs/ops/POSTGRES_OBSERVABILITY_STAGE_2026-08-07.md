# PostgreSQL observability stage — 2026-08-07

**Status: STAGED, NOT APPLIED TO PRODUCTION.**

The current PostgreSQL 18 production instance is healthy, but query-level observability is intentionally limited: `pg_stat_statements` is not installed, `shared_preload_libraries` is empty, `track_io_timing=off`, `log_min_duration_statement=-1`, and raw statement logging is disabled. Enabling `pg_stat_statements` requires a PostgreSQL restart, so it must not be introduced accidentally by an ordinary deploy.

## Privacy boundary

Mercasto must not use raw statement logs as its query-performance source. Reports should use `pg_stat_statements.queryid` plus aggregate timing/call/block counters by default. The staged profile in `scripts/postgres-query-profile.sh` deliberately excludes SQL text and therefore cannot expose literal parameter values, tokens, emails, search terms, or payment payloads.

## Current read-only evidence

At the 2026-08-07 snapshot:

- 1 database connection, 1 active;
- 0 lock waiters;
- 0 transactions older than 30 seconds;
- 0 idle-in-transaction sessions;
- `ads`: ~5,905 live / 1,170 dead tuples (~16.54% dead);
- `personal_access_tokens`: ~919 live / 154 dead (~14.35%);
- high ratios on several tiny tables are low absolute counts and are not an emergency maintenance signal;
- 21 foreign keys currently lack a leading child index; this inventory is emitted by the snapshot and must be reviewed by growth/delete/update behavior before any index is added.

The database is not currently constrained by locks or connections, so there is no justification for speculative index or autovacuum changes.

## Staged configuration

`ops/postgres/pg-stat-statements.staged.conf` is an **unwired template**. It stages:

- `shared_preload_libraries='pg_stat_statements'`;
- `track_io_timing=on`;
- top-level statement tracking;
- no utility-statement tracking;
- saved statistics across clean restarts;
- raw SQL logging kept disabled.

No Docker Compose file, Dockerfile or live PostgreSQL config includes this staged file.

## Controlled activation runbook

Activation should be a separate reviewed maintenance change **before the final 48-hour launch observation window starts**, never during that window.

1. Run `bash scripts/offsite-backup-smoke.sh` and require a fresh off-host backup plus successful restore drill.
2. Run `bash scripts/postgres-observability-snapshot.sh`; require zero lock waiters and no long/idle transactions.
3. Record current container health and a rollback point.
4. Apply only the reviewed preload/I/O timing settings to the real PostgreSQL config.
5. Perform one controlled PostgreSQL restart and verify database/backend readiness immediately.
6. Create/verify the `pg_stat_statements` extension after preload is active.
7. Re-run public/API/database smoke gates.
8. Capture queryid-only profiles by total execution time, mean execution time and calls; do not export SQL parameter values.
9. Let index usage accumulate long enough to justify any duplicate/unused-index proposal.
10. For every later index change, require pre/post plan and write-latency evidence; use concurrent index operations where supported and justified.

Rollback is to restore the prior PostgreSQL settings, restart once in the same controlled window, verify the application, and retain the aggregate incident evidence.
