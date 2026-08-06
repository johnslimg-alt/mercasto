# Mercasto PostgreSQL and Backup Audit Runbook

Owner: PostgreSQL Agent + DBA Super Specialist

Purpose: confirm that PostgreSQL, pgvector, migrations, indexes, and backups are launch-ready.

## Safety rule

Do not run destructive SQL during audit. No `DROP`, `TRUNCATE`, destructive `ALTER`, or restore overwrite without explicit approval and snapshot.

## 1. Container and service health

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker compose ps
```

Expected:

- database container healthy;
- backend healthy;
- worker running;
- scheduler running;
- frontend running;
- Redis internal;
- PostgreSQL internal.

## 2. PostgreSQL version and extensions

```bash
docker exec -it mercasto_db_container psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c 'select version();'
docker exec -it mercasto_db_container psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "select extname, extversion from pg_extension order by extname;"
```

Expected:

- PostgreSQL 18.x;
- `vector` extension installed;
- required standard extensions present if used.

## 3. Migration status

```bash
docker exec -it mercasto_backend_container php artisan migrate:status
```

Expected:

- all required migrations ran;
- no pending production migration unless planned.

## 4. Table inventory

```bash
docker exec -it mercasto_db_container psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "\dt"
```

Expected core tables:

- users;
- ads;
- categories;
- favorites if enabled;
- reports if enabled;
- notifications if enabled;
- jobs/queue tables if database queue is used;
- sessions if database sessions are used.

Compare planner estimates with actual counts for suspicious or unexpectedly large relations:

```sql
SELECT relname, n_live_tup, n_dead_tup, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Run exact COUNT only for a bounded list of relations that look inconsistent.
SELECT count(*) FROM real_estate_developments;
```

A read-only audit must report stale statistics; it must not run `ANALYZE`, `VACUUM` or table rewrites without an approved maintenance step.

## 5. Index audit

List indexes:

```bash
docker exec -it mercasto_db_container psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c "\di"
```

Recommended indexes to verify depending on schema:

- ads(status, created_at);
- ads(category, status);
- ads(user_id);
- ads(price);
- ads(location) or normalized city/state fields;
- ads(latitude, longitude) if radius search is frequent;
- vector index on embedding if semantic search is live;
- reports(status) if moderation queue exists;
- user_notifications(user_id, is_read, created_at) if notification cleanup/query volume justifies it.

## 6. Query plan samples

Run only read-only EXPLAIN statements.

```sql
SET statement_timeout = '15s';
BEGIN READ ONLY;
EXPLAIN (ANALYZE, BUFFERS, WAL, SUMMARY)
SELECT * FROM ads WHERE status = 'active' ORDER BY created_at DESC LIMIT 16;
EXPLAIN (ANALYZE, BUFFERS, WAL, SUMMARY)
SELECT * FROM ads WHERE status = 'active' AND category = 'motor' ORDER BY created_at DESC LIMIT 16;
ROLLBACK;
```

For vector search, use a vector with the actual stored dimension instead of a hand-written short literal:

```sql
BEGIN READ ONLY;
EXPLAIN (ANALYZE, BUFFERS, WAL, SUMMARY)
SELECT id
FROM ads
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM ads WHERE embedding IS NOT NULL LIMIT 1)
LIMIT 16;
ROLLBACK;
```

Expected:

- no full table scan on hot paths once data grows;
- p95 endpoint latency target defined;
- missing indexes converted to follow-up issues.

## 7. Backup job audit

Check backup directory:

```bash
ls -lah postgres-backups || true
find postgres-backups -type f -maxdepth 1 -print | tail -20 || true
LATEST_BACKUP=$(ls -t postgres-backups/*.dump | head -1)
pg_restore -l "$LATEST_BACKUP" >/dev/null
findmnt -T postgres-backups -o TARGET,SOURCE,FSTYPE,OPTIONS
findmnt -T /path/to/remote-or-replicated/backups -o TARGET,SOURCE,FSTYPE,OPTIONS
```

Expected:

- backups exist;
- file timestamps are recent;
- retention is working;
- backup size is plausible;
- a purported off-host copy resolves to a different failure domain, not only a second directory on the production disk.

## 8. Manual backup test

Create a manual backup without overwriting existing data:

```bash
mkdir -p postgres-backups/manual
FILE="postgres-backups/manual/manual_$(date +%Y%m%d_%H%M%S).dump"
docker exec mercasto_db_container pg_dump -U "$DB_USERNAME" -d "$DB_DATABASE" -F c > "$FILE"
ls -lh "$FILE"
```

## 9. Restore verification without touching production DB

Create a temporary restore database or temporary container. Never restore over production during audit.

Required pattern:

1. Start a disposable PostgreSQL container/database outside the production cluster.
2. Retrieve the chosen local or remote artifact and verify its checksum.
3. Restore with `pg_restore --no-owner` into the disposable target.
4. Verify extensions, migrations, row counts and smoke tests.
5. Destroy the disposable target after evidence is recorded.

```bash
LATEST_BACKUP=$(ls -t postgres-backups/*.dump | head -1)
pg_restore -l "$LATEST_BACKUP" >/dev/null
pg_restore --no-owner --dbname="$DISPOSABLE_DATABASE_URL" "$LATEST_BACKUP"
```

Never create/drop the audit target inside the live production database cluster unless a separately approved recovery procedure explicitly requires it.

## 10. Output format

```markdown
# PostgreSQL Audit Result

Date:
Commit/Deploy:
Operator:

## Summary
PASS / FAIL

## Version and extensions

## Migration status

## Hot query risks

## Missing indexes

## Backup status

## Restore test result

## Follow-up issues
```

## Release rule

- No paid traffic if backups are not restorable.
- No major launch if core listing queries are slow under expected data size.
- No semantic search launch if vector index/query path is not verified.
