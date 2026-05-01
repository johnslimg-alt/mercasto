# Mercasto production deploy and smoke checklist

This checklist is the required operator flow before and after deploying Mercasto to production.

## 1. Pre-deploy safety

- Confirm the target host and domain are correct: `mercasto.com` / `www.mercasto.com`.
- Confirm there is a recent database backup.
- Confirm there is a recent filesystem backup for uploads, config files and compose files.
- Confirm rollback artifacts are available before changing running containers.
- Confirm secrets are not printed in terminal output, screenshots or logs.

## 2. Repository and config validation

Run from the repository root on the deployment host:

```bash
git status --short
git rev-parse --short HEAD
docker compose config
```

Expected result:

- working tree is clean or contains only intentional deployment-local files;
- commit SHA is the intended release;
- compose config renders without errors.

## 3. Build validation

```bash
docker compose build mercasto-frontend mercasto-backend mercasto-worker mercasto-scheduler mercasto-reverb
```

Expected result:

- frontend image builds;
- backend image builds;
- Composer install succeeds;
- frontend asset build succeeds when `package-lock.json` exists;
- PHP extensions compile successfully.

## 4. Deploy

```bash
docker compose up -d
```

Expected result:

- containers start in detached mode;
- no unexpected container recreation outside the intended release scope.

## 5. Container health and logs

```bash
docker compose ps
docker compose logs --tail=150 mercasto-frontend mercasto-backend mercasto-worker mercasto-scheduler mercasto-reverb postgres redis
```

Expected result:

- frontend and backend are running;
- postgres and redis are healthy;
- worker, scheduler and reverb are running;
- logs do not show fatal PHP errors, failed migrations, missing env values or repeated restart loops.

## 6. Public smoke test

Run these checks from outside the server when possible:

```bash
curl -I https://mercasto.com/
curl -I https://www.mercasto.com/
curl -I https://mercasto.com/up
curl -I https://mercasto.com/api/categories
curl -I 'https://mercasto.com/api/ads?page=1'
```

Expected result:

- homepage returns `200` or a valid SPA response;
- `www` domain works or redirects consistently;
- `/up` returns `200`;
- API endpoints do not return `500`;
- TLS certificate is valid.

## 7. Product smoke test

Check in browser on desktop and mobile viewport:

- homepage loads without broken layout;
- catalog/listings page loads;
- listing cards show image fallback when no photo exists;
- login page opens;
- register page opens;
- authenticated account page is protected from guests;
- publish flow opens for authenticated seller;
- seller account pages do not show raw PHP/Laravel errors;
- uploaded photos load through `/storage/`;
- no public text says `MVP`, debug, stack trace, placeholder copy or old domain copy.

## 8. Security smoke test

```bash
curl -I https://mercasto.com/.env
curl -I https://mercasto.com/.git/config
curl -I https://mercasto.com/backend/.env
curl -I https://mercasto.com/storage/../.env
```

Expected result:

- protected probe paths return `403`, `404` or equivalent safe response;
- no secrets or raw config are returned;
- response headers include baseline security headers.

## 9. Ollama exposure check

From an external machine:

```bash
curl -m 5 http://mercasto.com:11434/api/tags
curl -m 5 http://72.62.173.145:11434/api/tags
```

Expected result:

- both requests fail or time out from the public internet;
- Ollama must only be reachable inside the Docker network unless explicitly protected behind authenticated internal access.

If public access succeeds, stop and fix host-level exposure before launch.

## 10. Rollback trigger conditions

Rollback immediately if any of these happen:

- homepage or catalog returns repeated `5xx`;
- login/register is broken;
- publish flow is broken;
- public API endpoints return repeated `5xx`;
- photos do not load;
- Clip/payment webhooks fail unexpectedly;
- sensitive files are publicly reachable;
- Ollama or internal services are publicly exposed.

## 11. Rollback outline

```bash
git log --oneline -5
git checkout <previous-good-commit>
docker compose build mercasto-frontend mercasto-backend
docker compose up -d
docker compose ps
docker compose logs --tail=150
```

If database migrations were applied, restore the database backup or run the documented reverse migration before reopening traffic.

## 12. Post-deploy record

Record after each production deploy:

- date/time;
- deployed commit SHA;
- operator;
- backup location;
- smoke test result;
- known warnings;
- rollback commit SHA.
