# PostgreSQL observability — 2026-08-07

**Status after deployment of this change: ACTIVE AFTER DEPLOYMENT.**

Mercasto uses PostgreSQL 18. `pg_stat_statements` and I/O timing are enabled through the versioned `postgres` command in `docker-compose.yml`, so the configuration is reproducible after disaster recovery. The Laravel migration `2026_08_07_063000_enable_pg_stat_statements_extension.php` creates the extension after PostgreSQL starts with the preload library.

## Privacy boundary

Raw SQL statement logging stays disabled. Performance reports use `pg_stat_statements.queryid` plus aggregate timing/call/block counters. `scripts/postgres-query-profile.sh` deliberately excludes normalized SQL text and therefore does not export literal parameter values, tokens, emails, search terms, or payment payloads.

## Activation evidence and prerequisites

Before activation on 2026-08-07:

- off-host backup smoke reported a fresh R2 backup and successful restore drill;
- PostgreSQL was healthy with zero container restarts;
- read-only snapshot showed 1 connection, zero lock waiters, zero transactions older than 30 seconds, and zero idle-in-transaction sessions;
- disposable PostgreSQL 18 drill proved the exact preload/I/O settings, extension creation, and readable `pg_stat_statements` view.

The same snapshot inventories 21 foreign keys without a leading child index. That list is evidence for later review, not permission to add indexes speculatively.

## Active configuration

The versioned compose command applies:

- `shared_preload_libraries=pg_stat_statements`;
- `compute_query_id=auto`;
- `track_io_timing=on`;
- top-level statement tracking;
- utility-statement tracking disabled;
- statistics saved across clean restarts;
- maximum tracked statements 5000;
- `log_statement=none` and `log_min_duration_statement=-1`.

`ops/postgres/pg-stat-statements.reference.conf` mirrors these values for review. The runtime source of truth is `docker-compose.yml`.

## Deployment verification

The ordinary application deploy updated the compose definition and migration but did not recreate the already-running PostgreSQL container. Because `shared_preload_libraries` is a postmaster setting, activation therefore used one explicit targeted `--force-recreate postgres` only after the off-host backup/restore drill and normalized compose command were rechecked. The recreated database became healthy at `2026-08-07T06:50:52Z`, after which the activation smoke and public endpoints passed.

Future PostgreSQL containers created from the versioned compose definition inherit the active settings automatically. Verification requires:

1. `bash scripts/offsite-backup-smoke.sh` green before any intentional PostgreSQL recreate;
2. normal Docker database health after startup;
3. the PostgreSQL-only migration to keep `pg_stat_statements` installed;
4. `bash scripts/postgres-observability-activation-smoke.sh` green;
5. public/API/live gates and Autonomous Server Live Gate green;
6. queryid-only profiling after enough calls accumulate.

Activation completed before the final 48-hour launch observation window. No index add/drop or autovacuum tuning was part of activation.

## Read-only health watch

`PostgreSQL Observability Watch` runs every six hours from the trusted production checkout without a repository checkout on the self-hosted runner. It alerts only on aggregate operational thresholds: connection saturation at or above 80%, lock waiters, transactions older than 60 seconds, idle-in-transaction sessions, material dead-tuple pressure, autovacuum lag, or loss of the pg_stat_statements activation contract. It never exports SQL text/parameters and never restarts, vacuums, or changes indexes.

## Rollback

If PostgreSQL, backend health, or public smoke fails after activation:

1. revert the compose activation commit;
2. recreate/restart PostgreSQL once with the prior command;
3. verify database/backend/public health;
4. optionally run the migration down step to drop `pg_stat_statements` after the application is stable;
5. retain the read-only aggregate evidence and do not perform index cleanup.

Leaving the extension installed while the preload setting is reverted is not a data-loss event, but the profile view must not be queried until preload is restored.
