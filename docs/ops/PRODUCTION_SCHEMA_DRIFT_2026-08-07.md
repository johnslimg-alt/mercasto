# Production schema drift evidence — 2026-08-07

Read-only production inventory found 57 public base tables. Current migrations declared 48 before this repair.

Recovered/adopted schema contracts in this change:

- `blocked_users`: production migration ledger records `2026_07_02_000001_create_blocked_users_table`; original migration recovered from Git history.
- `image_hashes`: production migration ledger records `2026_06_21_100000_create_image_hashes_table`; migration reconstructed from production DDL.
- `user_violations`: production migration ledger records `2026_06_21_200000_create_user_violations_table`; migration reconstructed from production DDL.
- `referrals`: used by current application code but had no migration in the repository; an idempotent adoption migration now recreates its production contract on fresh databases.
- `payment_products`: contained 11 rows and was created dynamically by `PaymentProductsSeeder`; schema creation is moved to an idempotent adoption migration and the seeder now only seeds rows.

Known unmanaged production-only tables remain intentionally untouched:

- `blacklist`: 0 rows; no current repository consumer or migration found.
- `category_names_backup_20260704`: 7 rows; production backup artifact, no current repository consumer.
- `real_estate_developments`: 144,593 rows, ~16 MB; no current repository consumer. Ownership/source/license decision remains tracked in #505.

A root-only logical export of `real_estate_developments` was created before any future schema action:

- path: `/root/schema-drift-backups/real_estate_developments-20260807T050713Z/real_estate_developments.dump`
- SHA-256: `6cb8026e28c95ac4438f6f30c773997d1aca62000dbc7aabac0f238a374ce53b`
- custom-format archive validated with PostgreSQL 18 `pg_restore -l`.

No rows were deleted, renamed, truncated, mass-updated, or exposed during this audit. The original 2026-08-07 snapshot predated `pg_stat_statements` activation, so that snapshot alone could not attribute historic sequential scans to an external consumer. Repository and server-job scans found no direct `real_estate_developments` reference.

## Fresh runtime evidence — 2026-09-06

After `pg_stat_statements` activation and a fresh observability reset, a read-only dependency scan found **0 statement IDs / 0 calls** referencing `real_estate_developments` outside observability introspection. The same scan found no direct references in cron/systemd service files or active container command/entrypoint definitions. Repository references are limited to the schema-drift allowlist, observability guard, contract scripts and this evidence document; no application consumer was found.

This strengthens the zero-consumer evidence but does **not** establish source, license, product ownership or permission to retire the table. The adopt-vs-retire decision remains owner-gated under #505. A reproducible read-only scan is available as `bash scripts/real-estate-unmanaged-dependency-scan.sh`; it outputs only aggregate statement counts and file/container names, never SQL text or row contents.

`production-schema-drift-smoke.sh` now compares live public tables with migration-declared tables plus the explicit known-unmanaged allowlist and fails on any unexpected addition, missing managed table, missing known-unmanaged table, or overlap between managed and unmanaged sets.
