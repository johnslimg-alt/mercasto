# Mercasto Production Verification Gates

Status: active
Owner: production coordination lane

This document is the shared command contract for agents, release checks and rollback checks.

## 1. Baseline repository state

Run from the production repository root:

```bash
cd /var/www/mercasto
git rev-parse --short HEAD
git status --short
```

Expected:

- Current commit is visible.
- Working tree state is known before deploy, rebuild or rollback.

## 2. Docker Compose merged config

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml config
```

Expected:

- Compose config renders successfully.
- Base and override files are evaluated together.
- Expected production services are present.

## 3. Container status

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml ps
```

Expected:

- Core services are running.
- Backend/frontend/database/cache health checks are green where configured.
- No unexpected restart loop is visible.

## 4. Quick verification gate

```bash
npm run verify:quick
```

Expected:

- Script checks pass.
- Compose validation passes.
- Public smoke routes return safe statuses.
- Sensitive path probes return safe denial.

## 5. Full production verification gate

```bash
npm run verify:prod
```

Expected:

- Quick checks pass.
- Production smoke passes.
- Security probes pass.
- Maintenance precheck runs.

## 6. Public HTTP smoke

Manual fallback commands:

```bash
curl -I https://mercasto.com/up
curl -I https://mercasto.com/
curl -I https://mercasto.com/api/categories
curl -I 'https://mercasto.com/api/ads?page=1'
```

Expected:

- `/up` returns 200.
- `/` returns 200 or an intentional redirect.
- API endpoints do not return 5xx.

## 7. Sensitive path probes

Manual fallback commands:

```bash
curl -I https://mercasto.com/.env
curl -I https://mercasto.com/.git/config
curl -I https://mercasto.com/backend/.env
curl -I https://mercasto.com/composer.json
curl -I https://mercasto.com/package.json
```

Expected:

- Each path returns safe denial such as 403, 404 or 410.
- No secret/config content is returned.
- No stack trace is returned.

## 8. Internal service exposure probes

Manual fallback commands:

```bash
curl -m 5 http://72.62.173.145:11434/api/tags
curl -m 5 http://72.62.173.145:6379
curl -m 5 http://72.62.173.145:5432
curl -m 5 http://72.62.173.145:9090
curl -m 5 http://72.62.173.145:8080
```

Expected:

- External access is closed or unreachable.
- Internal-only services do not expose public responses.

## 9. Backend image verification

After backend Dockerfile changes:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml build mercasto-backend
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d mercasto-backend mercasto-worker mercasto-scheduler mercasto-reverb
npm run verify:quick
```

Expected:

- Backend image builds.
- Backend service becomes healthy.
- Worker/scheduler/reverb stay running.
- Quick verification passes.

## 10. Route inventory gate

After route or middleware changes, generate and validate a route inventory artifact:

```bash
cd /var/www/mercasto
bash scripts/route-inventory-gate.sh
```

The gate runs:

```bash
bash scripts/export-route-inventory.sh
bash scripts/check-route-inventory-artifact.sh
```

The generated artifact is:

```text
docs/route-inventory-generated.md
```

Manual fallback command:

```bash
cd /var/www/mercasto/backend
php artisan route:list --except-vendor -v
```

Then update the curated route inventory if needed:

```text
docs/route-inventory.md
```

Expected:

- Route list generation succeeds.
- Route inventory artifact exists and is not empty.
- Middleware is visible.
- State-changing browser routes are identified.
- Protected routes are marked.
- Follow-up gaps are tracked.

## 11. Rollback gate

Before risky changes:

```bash
cd /var/www/mercasto
git rev-parse --short HEAD
ls -lah postgres-backups | tail
npm run verify:quick
```

Expected:

- Current commit is known.
- Backup visibility is confirmed.
- Quick verification is green before change.

After rollback:

```bash
npm run verify:quick
```

Expected:

- Quick verification returns to green.

## 12. PostgreSQL migration gate

Run this before pushing any change under `backend/database/migrations/`.

`backend/phpunit.xml` forces `DB_CONNECTION=sqlite` and `DB_DATABASE=:memory:`, so the
PHPUnit suite never executes the PostgreSQL DDL that production executes. SQLite does not
enforce foreign keys unless they are switched on, has no lock levels, no
`ACCESS EXCLUSIVE`, no real `ALTER COLUMN ... TYPE` and no enum types, so a migration can
pass the suite and still be wrong on the engine that runs it.

```bash
cd /var/www/mercasto
bash scripts/verify-migrations-postgres.sh
```

Expected:

- `RESULT: PASS` and exit 0 before the migration is pushed.
- A non-zero exit on any of: `up()` failing on PostgreSQL, a captured DDL statement whose
  effect is not in the resulting catalog, a re-apply that is not a no-op, a `down()` that
  deletes rows, or an `up()` → `down()` round trip that does not restore the baseline
  schema.
- The path printed as `artifacts :` holds the captured SQL, the schema fingerprints and
  the per-column fill report for the reviewer.

What it does, on a throwaway `pgvector/pgvector:pg18` container:

1. applies every other migration as a baseline, then seeds deterministic rows into the
   tables the migration names (parents first, so foreign keys hold);
2. applies `up()` and captures the SQL the server actually ran;
3. re-checks every captured DDL statement against the resulting catalog, including the
   `ON DELETE` action of any foreign key it re-created — the same constraint name coming
   back with different delete semantics is a defect no name-level check can see;
4. deletes the migration's row from `migrations` and applies `up()` again, requiring the
   schema and the seeded rows to be unchanged;
5. sets every nullable column it can to NULL, then runs `down()` and reports exactly what
   was destroyed — columns dropped and rows deleted. Rows deleted from a table other than
   `migrations` fail the run unless `--allow-down-data-loss` accepts it;
6. requires the `up()` → `down()` round trip to restore the baseline schema;
7. lists every lock-taking statement next to the production row count of its table, then
   measures the real requirement by holding `ACCESS SHARE` on every table (only
   `ACCESS EXCLUSIVE` conflicts with it) and, separately, `ROW EXCLUSIVE` on each table
   the migration's foreign keys reference.

Variations:

```bash
bash scripts/verify-migrations-postgres.sh --static-only          # seconds, no container
bash scripts/verify-migrations-postgres.sh --all                  # whole set from scratch
bash scripts/verify-migrations-postgres.sh --seed-sql=rows.sql    # realistic rows before up()
bash scripts/verify-migrations-postgres.sh --no-production-counts # no production reads
bash scripts/verify-migrations-postgres.sh --allow-down-data-loss # accept a lossy down()
bash scripts/verify-migrations-postgres.sh --require-targets      # empty selection is an error
bash scripts/verify-migrations-postgres.sh backend/database/migrations/<file>.php
```

Safety: the tool creates its own container, builds its own DSN from that container's own
published port, and never reads `DB_*` from `backend/.env`. Before touching anything it
asserts the connection terminates inside that container and aborts otherwise. The
container is removed on exit, including on failure. Production is only ever read, and only
for row counts, and only while `--production-counts` is left on.

CI: `.github/workflows/migration-postgres-gate.yml` runs the same tool on a GitHub-hosted
runner for pull requests that touch `backend/database/migrations/**`. It does not use the
self-hosted runner, so it adds nothing to the serialised merge-queue work in D-121. It runs
`scripts/verify-migrations-postgres.test.sh` first, so a PASS is only trusted once the gate
has proved on that commit that it can fail.

## Notes

- Code rollback and database restore are separate operations.
- Database-affecting changes require backup visibility first.
- Runtime changes should be small, reversible and mapped to one lane.
- Documentation-only changes do not require production rebuild, but still require repository cleanliness.
