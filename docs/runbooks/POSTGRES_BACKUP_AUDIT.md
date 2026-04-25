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
- notifications(user_id, read_at) if notifications exist.

## 6. Query plan samples

Run only read-only EXPLAIN statements.

```sql
EXPLAIN ANALYZE SELECT * FROM ads WHERE status = 'active' ORDER BY created_at DESC LIMIT 16;
EXPLAIN ANALYZE SELECT * FROM ads WHERE status = 'active' AND category = 'autos' ORDER BY created_at DESC LIMIT 16;
```

For vector search, adapt to actual column name and operator:

```sql
EXPLAIN ANALYZE SELECT id FROM ads WHERE embedding IS NOT NULL ORDER BY embedding <=> '[0,0,0]'::vector LIMIT 16;
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
```

Expected:

- backups exist;
- file timestamps are recent;
- retention is working;
- backup size is plausible.

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

Suggested pattern:

```bash
# Create temp DB name
RESTORE_DB="mercasto_restore_test_$(date +%Y%m%d_%H%M%S)"

# Create temp database
docker exec mercasto_db_container createdb -U "$DB_USERNAME" "$RESTORE_DB"

# Restore latest backup into temp DB
LATEST_BACKUP=$(ls -t postgres-backups/*.dump | head -1)
cat "$LATEST_BACKUP" | docker exec -i mercasto_db_container pg_restore -U "$DB_USERNAME" -d "$RESTORE_DB"

# Inspect tables
docker exec mercasto_db_container psql -U "$DB_USERNAME" -d "$RESTORE_DB" -c "\dt"

# Drop temp DB after verification
docker exec mercasto_db_container dropdb -U "$DB_USERNAME" "$RESTORE_DB"
```

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
