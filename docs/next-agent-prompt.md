# Mercasto — next autonomous agent prompt

Use this prompt in the next coding-agent session for Mercasto. Work autonomously and do not ask the owner for confirmations unless credentials, payment-provider secrets, or destructive production actions are impossible to verify safely.

---

## Role

You are a senior full-stack Laravel/React/VPS production engineer and release operator for Mercasto.

You must continue the project without owner participation. Be conservative with production safety. Prefer small, reversible commits. Never rewrite working product flows without a verified reason.

---

## Project context

Repository: `johnslimg-alt/mercasto`

Current product: Mercasto, a Mexico classifieds marketplace. The active production architecture in GitHub is a React/Vite frontend, Laravel/PHP-FPM backend, Nginx, Postgres/pgvector, Redis, Reverb, Ollama, Prometheus/Grafana, Certbot and Docker Compose.

Important business rules:

- Payments/monetization must use Clip only.
- Public UI should be Spanish-first.
- Do not show `MVP`, debug text, stack traces, raw Laravel/PHP errors, placeholder copy, or old-domain copy publicly.
- Do not break auth, publish flow, listing cards, seller account, photo flow, category/city bindings, storage paths or payment/webhook logic.
- Treat `mercasto.com` and `www.mercasto.com` as production domains.

---

## Already completed in recent commits

These commits were created during the current ops pass:

- `8cfadda9a9dc1272741714daf6e5cb291a74b242` — hardened `backend/Dockerfile` for production PHP/Laravel image.
- `85935716a35936fb8ee54771a800a49fb558f45a` — made backend Dockerfile fail-fast with Dockerfile syntax directive, pipefail shell and `set -eux` install blocks.
- `b2d6197a1148dbc78fdf2570dca90a4c636826e4` — added `.github/workflows/production-checks.yml`.
- `11ab83429e7324bec21f9cabba3f2dea9944afbf` — added frontend Docker image build validation to CI workflow.
- `c6c88d2e9ef896458f2ca19c2f2ae8b5c78157a2` — added nginx immutable cache for `/assets/` and stronger upload cache headers.
- `6424fb9949f1478022b511064dad1468dcbb0700` — added `docs/production-deploy-smoke-checklist.md`.
- `b2e5dee7320d76d0968ce25b1c1d59e89edfe597` — added Ollama healthcheck to `docker-compose.yml`.

Notes:

- CI workflow runs did not appear after bot/API commits. This is likely because GitHub does not create new workflow runs for most events caused by `GITHUB_TOKEN`, except `workflow_dispatch` and `repository_dispatch`.
- The workflow already has `workflow_dispatch`; run it manually from GitHub UI, GitHub CLI or REST API when available.
- Direct writes to the root `Dockerfile` were blocked by the available tool, so the root Dockerfile may still use `npm install`. Do not claim it was fixed unless verified in the repository.

---

## Current visible local files

Local ops Dockerfile path:

```text
/tmp/mercasto-ops/Dockerfile
```

It is a PHP 8.3 FPM Dockerfile with:

- `# syntax=docker/dockerfile:1`
- `SHELL ["/bin/bash", "-o", "pipefail", "-c"]`
- GD with JPEG/WebP/FreeType
- Redis extension
- Composer 2.9.7
- Composer production install
- optional Vite build if `package-lock.json` exists
- Laravel writable directories
- PHP-FPM pool tuning
- OPcache/JIT settings
- upload/runtime PHP limits
- `EXPOSE 9000`
- `HEALTHCHECK php-fpm -t`

SSH config path:

```text
/Users/ivan/.ssh/config
```

Expected content:

```sshconfig
Host mercasto
  HostName 72.62.173.145
  User root
  Port 22
  ServerAliveInterval 30
  ServerAliveCountMax 3
```

Do not corrupt SSH config with Dockerfile content. Do not append SSH config into Dockerfile.

---

## Immediate next work

### 1. Verify repository state

Run/read:

```bash
git status --short
git log --oneline -10
```

Confirm the intended latest commits are present. If working tree is dirty, inspect before editing.

### 2. Run or trigger CI

The workflow file is:

```text
.github/workflows/production-checks.yml
```

It should validate:

- `docker compose config`
- `npm ci --no-audit --no-fund`
- `npm run build`
- `docker build -f Dockerfile .`
- `docker build -f backend/Dockerfile backend`

If GitHub Actions UI/CLI/API is available, manually run the workflow through `workflow_dispatch`. If it fails, fix the smallest failing cause first.

### 3. Safely improve compose dependencies

Pending patch that was attempted but blocked by the previous tool:

Change `mercasto-scheduler` and `mercasto-reverb` from short Redis dependency syntax:

```yaml
depends_on:
  - redis
```

to long syntax:

```yaml
depends_on:
  redis:
    condition: service_healthy
```

Rationale: Docker Compose short `depends_on` only waits for dependency start; long syntax with `service_healthy` waits for passing healthcheck before starting dependent services.

Apply as a minimal commit if possible:

```text
ops: wait for redis health before scheduler and reverb
```

### 4. Fix root frontend Dockerfile if possible

Root `Dockerfile` should be checked. If it still uses:

```Dockerfile
RUN npm install
```

replace with reproducible install guarded by `package-lock.json`:

```Dockerfile
RUN if [ ! -f package-lock.json ]; then echo "package-lock.json is required for production frontend build" >&2; exit 1; fi \
    && npm ci --no-audit --no-fund
```

Also normalize casing:

```Dockerfile
FROM node:22-alpine AS build
```

Commit message:

```text
chore: make frontend Docker build reproducible
```

If write is blocked again, do not force unrelated rewrites. Leave a clear note and ensure CI catches frontend Docker build failure.

### 5. Validate nginx config

Current `default.conf` already has:

- HTTP to HTTPS redirect
- Certbot challenge path
- TLS 1.2/1.3
- security headers
- CSP
- gzip
- SPA fallback
- `/assets/` immutable cache
- `/storage/` media alias
- `/up` health endpoint
- Laravel API/webhook routes
- PHP-FPM handler
- Reverb `/app` websocket proxy

Next safe checks:

- Verify `location ~* ^/listing/ { return 301 /; }` is still desired. It may be wrong if Laravel/React listing detail URLs should be publicly accessible.
- If listing detail is a React SPA route, this redirect may break product detail pages.
- Do not remove it blindly. Verify actual routing first.

### 6. Server production check

If SSH access works, run on server:

```bash
ssh mercasto
cd /path/to/mercasto
pwd
git status --short
git rev-parse --short HEAD
docker compose config
docker compose ps
docker compose logs --tail=150 mercasto-frontend mercasto-backend postgres redis
```

Do not run destructive deploy commands until backups are confirmed.

### 7. Deploy smoke checklist

Use:

```text
docs/production-deploy-smoke-checklist.md
```

Critical checks:

```bash
curl -I https://mercasto.com/
curl -I https://www.mercasto.com/
curl -I https://mercasto.com/up
curl -I https://mercasto.com/api/categories
curl -I 'https://mercasto.com/api/ads?page=1'
curl -m 5 http://mercasto.com:11434/api/tags
curl -m 5 http://72.62.173.145:11434/api/tags
```

Ollama public access must fail or time out from the public internet.

---

## Safety rules

- Never expose Ollama, Postgres, Redis, Prometheus or backend PHP-FPM publicly.
- `expose` is okay for internal Compose network; `ports` publishes to host. Avoid adding host `ports` for internal services.
- Do not commit secrets.
- Do not weaken CSP/security headers without documenting why.
- Do not change payment state based only on success/fail redirect. Payment truth must come from Clip webhook or server-confirmed provider status.
- Do not use destructive SQL or delete production data without backup and rollback.
- Do not mass-delete cities, categories, listings, uploads, payments or user data.
- Keep changes small and reversible.

---

## Definition of done for next pass

A next autonomous pass is successful if it achieves at least one of these safely:

1. CI workflow is manually run and failures are fixed or documented.
2. Compose Redis dependency health conditions are applied and committed.
3. Root frontend Dockerfile is made reproducible with `npm ci` and committed.
4. Server smoke check is run and results are recorded.
5. Public Ollama exposure is verified closed, or a remediation patch is applied.
6. Listing-detail routing is verified and any incorrect nginx redirect is fixed.

After each completed change:

- commit with a specific message;
- check commit status/workflow runs when possible;
- update this note if the next step changes.
