# Backup, restore and rollback runbook

This runbook is required evidence for issue #267 before public launch. Run destructive restore drills only on staging or disposable databases, never directly against production data.

## Scope

- Verify recent database backup availability.
- Verify a restore command path using PostgreSQL tools.
- Verify application rollback command path.
- Record output in issue #267 before public launch.

## Production safety rules

- Do not restore into the live production database during a drill.
- Do not print database passwords or secrets.
- Run Laravel commands inside `mercasto_backend_container`.
- Keep `mercasto_frontend_container` owning host ports `80/443` unless issue #261 is completed.
- Require `UP=200` and `VERIFY_EXIT=0` after any rollback or sync.

## Backup freshness check

Run from the server repository root:

```bash
cd /var/www/mercasto || exit 1
npm run smoke:backup-freshness
```

Expected:

```text
backup freshness smoke OK
```

## Live production sanity check

```bash
cd /var/www/mercasto || exit 1
docker exec mercasto_backend_container php artisan migrate --force
bash scripts/server-operator.sh verify_quick; echo "VERIFY_EXIT=$?"
```

Expected:

```text
INFO  Nothing to migrate.
VERIFY_EXIT=0
```

## Restore drill outline for staging/disposable database

1. Pick the newest verified backup artifact.
2. Create or reset a disposable target database.
3. Restore using PostgreSQL tools.
4. Run Laravel migrations against the restored database.
5. Run category and public smoke checks.
6. Destroy the disposable target database after evidence is recorded.

Example command shape for a custom-format PostgreSQL archive:

```bash
pg_restore --clean --if-exists --no-owner --dbname="$STAGING_DATABASE_URL" "$BACKUP_FILE"
```

If restoring inside Docker, run the restore from a container that has PostgreSQL client tools and network access to the target database.

## Rollback drill outline

1. Record current commit:

```bash
git rev-parse --short HEAD
```

2. Reset to a known previous good commit or release tag:

```bash
git fetch origin main
git reset --hard <KNOWN_GOOD_COMMIT>
```

3. Recreate affected containers only when needed:

```bash
docker compose --env-file backend/.env -f docker-compose.yml -f docker-compose.override.yml up -d --build mercasto-backend mercasto-frontend mercasto-reverb
```

4. Run migrations safely:

```bash
docker exec mercasto_backend_container php artisan migrate --force
```

5. Verify:

```bash
curl -k -sS -o /dev/null -w 'UP=%{http_code}\n' https://mercasto.com/up
bash scripts/server-operator.sh verify_quick; echo "VERIFY_EXIT=$?"
```

## Evidence to record in issue #267

- backup file path pattern and latest timestamp, without secrets;
- restore target type, staging/disposable only;
- `pg_restore` or equivalent output summary;
- `php artisan migrate --force` result;
- `UP=200` result;
- `VERIFY_EXIT=0` result;
- rollback commit before/after;
- any manual actions needed.
