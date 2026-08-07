# Off-host PostgreSQL backup and restore runbook

## Production contract

- Source: stable `backup_*.dump` custom-format snapshots from `/var/www/mercasto/postgres-backups`.
- Failure domain: private Cloudflare R2 object storage, outside the VPS disk.
- Prefix: `private-backups/postgres/{daily,weekly,monthly}/...`.
- Retention lifecycle: daily 14 days, weekly 56 days, monthly 365 days.
- Encryption: client-side AES-256-CBC with PBKDF2-SHA256 (310,000 iterations) before upload.
- Integrity: plaintext SHA-256 manifest, encrypted SHA-256 manifest, R2 metadata, and PostgreSQL 18 `pg_restore -l` verification after download/decryption.
- Credentials: root-readable files under `/root/.secrets`; never Git-tracked or logged.

## Schedule, RPO, RTO and owner

`mercasto-offsite-backup.timer` runs every six hours and replicates the newest stable daily dump. Weekly and monthly copies are promoted from the same verified artifact into lifecycle-scoped prefixes. `mercasto-offsite-restore-drill.timer` performs a disposable remote restore drill on the first day of every month.

Operational owner: repository/production owner `@johnslimg-alt`. Target RPO is 24 hours (daily database snapshot with at most six hours replication lag after a completed snapshot). Target operational RTO is two hours for credential recovery, remote retrieval, checksum/decryption, database restore and application validation.

## Restore evidence

On 2026-08-07 UTC, `backup_20260806_1911.dump` was independently uploaded into daily, weekly and monthly R2 prefixes, downloaded again, decrypted, matched against its SHA-256 manifest, and validated by PostgreSQL 18 with 631 TOC entries. The downloaded artifact was restored into a disposable database containing 57 public tables; the scratch database was then dropped. Production data was not overwritten.

## Failure and restore procedure

1. Check `systemctl status mercasto-offsite-backup.service` and `/var/log/mercasto-offsite-backup.log` without printing secret files.
2. Run `sudo /usr/local/sbin/mercasto-offsite-backup --status`; a stale state, missing R2 object or failure marker is a launch/operations failure.
3. Keep the local backup container enabled while investigating. Do not delete local dumps to make the gate green.
4. Fix network/credential/R2 issues, then run a normal replication. For recovery assurance, run `--restore-drill`; it restores only into a uniquely named scratch database and deletes it afterward.
5. During a real incident, first download/decrypt and validate the chosen R2 object and SHA-256 manifest. Restore to a new or explicitly isolated database; never run a destructive restore against production without an incident decision and rollback point.
6. The self-hosted `verify_quick` gate calls `scripts/offsite-backup-smoke.sh`. Failure is surfaced through the existing production/server live-gate incident workflow.

Installation is explicit and root-only: `sudo ops/backups/install-offsite-backup.sh`. Initial retention seeding and proof is `sudo /usr/local/sbin/mercasto-offsite-backup --seed-retention --restore-drill`.
