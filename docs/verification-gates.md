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

After route or middleware changes:

```bash
cd /var/www/mercasto/backend
php artisan route:list --except-vendor -v
```

Then update:

```text
docs/route-inventory.md
```

Expected:

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

## Notes

- Code rollback and database restore are separate operations.
- Database-affecting changes require backup visibility first.
- Runtime changes should be small, reversible and mapped to one lane.
- Documentation-only changes do not require production rebuild, but still require repository cleanliness.
