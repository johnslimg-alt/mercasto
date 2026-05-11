# Mercasto Dependency Update Policy

This policy keeps Mercasto current without turning dependency updates into uncontrolled production risk.

## Update automation

Mercasto uses:

- Dependabot version updates for npm, GitHub Actions, and Docker manifests;
- a scheduled dependency update audit workflow;
- production checks and smoke/security probes before changes are considered safe.

## Auto-merge eligibility

A dependency PR may be an auto-merge candidate only when all of these are true:

1. The PR is created by Dependabot or an approved automation account.
2. The update is semver patch or semver minor.
3. The ecosystem is one of:
   - npm;
   - GitHub Actions;
   - Docker.
4. Required CI checks pass.
5. The production deployment path is not modified in a way that bypasses smoke/security probes.
6. The PR does not introduce new secrets, generated credentials, runner state, local `.env` files, or backups.

## Updates that must not auto-merge

Do not auto-merge:

- semver major updates;
- framework major upgrades such as Laravel, React, Vite, Tailwind, PHP, Node, PostgreSQL, Redis, or nginx;
- database/image upgrades that may affect persistent data formats;
- changes to payment, auth, deployment, runner, or workflow security behavior;
- PRs that modify `pull_request_target` workflows to checkout or execute PR code;
- PRs that disable, weaken, or skip smoke/security checks.

These changes require an explicit technical review and a rollback plan.

## Required verification before merge

For production-affecting updates, verify at least:

```bash
npm run build
npm run verify:quick
```

For Docker/runtime updates, also verify:

```bash
docker compose config
docker compose -f docker-compose.yml -f docker-compose.override.yml config
```

After deployment, verify:

```bash
curl -I https://mercasto.com/
curl -I https://mercasto.com/api/categories
curl -I https://mercasto.com/api/ads?page=1
curl -I https://mercasto.com/horizon
curl -I https://mercasto.com/vendor/horizon
```

Expected production-sensitive behavior:

- `/`, `/api/categories`, and `/api/ads?page=1` return HTTP 200;
- `/horizon` and `/vendor/horizon` return HTTP 404;
- sensitive files such as `/.env`, `/.git/config`, `/backend/.env`, `/composer.json`, and `/package.json` return HTTP 404;
- internal service ports are not publicly reachable.

## Dependency audit artifacts

The dependency audit workflow should preserve artifacts for review, including:

- `npm-outdated.json`;
- `npm-audit.json`;
- `composer-outdated.json`;
- `composer-audit.json`;
- Docker image inventory and Docker Scout recommendations when available.

Use these artifacts to decide whether to open controlled update PRs.

## Composer policy

Composer lock files preserve a known-good dependency set. Do not run broad `composer update` directly against production without reviewing the resulting lockfile diff.

Preferred Composer workflow:

1. Audit with `composer outdated` and `composer audit`.
2. Update a narrow package group.
3. Review `composer.lock` diff.
4. Run backend build/tests/smoke.
5. Deploy only after checks pass.

## NPM policy

Preferred npm workflow:

1. Audit with `npm outdated` and `npm audit`.
2. Apply patch/minor updates first.
3. Keep major updates isolated in dedicated PRs.
4. Run `npm ci` and `npm run build`.
5. Run production smoke before considering the update complete.

## Docker image policy

Preferred Docker workflow:

1. Inventory images with `docker compose config --images`.
2. Review Docker Scout quickview/recommendations when available.
3. Update one runtime image group at a time.
4. Rebuild and smoke test.
5. Keep database and persistent service image major upgrades separate with backups and rollback planning.

## Rollback policy

Every production dependency update must have a rollback path:

- revert the merge commit or PR;
- redeploy the previous known-good image/commit;
- confirm smoke/security probes return to green;
- document the cause and mitigation in the autonomous hardening queue.
