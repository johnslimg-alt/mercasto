# Mercasto Server Operator

This runbook defines the guarded production server operator path for Mercasto.

## Purpose

Use this path when an AI agent, maintainer, or operator needs to run production diagnostics, verification, deployment, restarts, security checks, SEO/AEO checks, or controlled cleanup without copying long shell commands into the server manually.

GitHub remains the source of truth. Direct server operations are allowed only through the guarded script/workflow and should keep production synced to `origin/main`.

## Entry points

### GitHub Actions

Workflow: **Server Operator**

Supported operations:

- `status`
- `verify_quick`
- `deploy_main`
- `restart_frontend`
- `restart_stack`
- `security_smoke`
- `seo_aeo_smoke`
- `runner_health`
- `logs_frontend`
- `logs_backend`
- `cleanup_docker`

Mutating operations require `confirm=MERCASTO`:

- `deploy_main`
- `restart_frontend`
- `restart_stack`
- `cleanup_docker`

### Direct server shell

From the production server:

```bash
cd /var/www/mercasto
bash scripts/server-operator.sh status
bash scripts/server-operator.sh verify_quick
bash scripts/server-operator.sh security_smoke
bash scripts/server-operator.sh seo_aeo_smoke
bash scripts/server-operator.sh runner_health
bash scripts/server-operator.sh logs_frontend
bash scripts/server-operator.sh logs_backend
```

Mutating operations:

```bash
cd /var/www/mercasto
bash scripts/server-operator.sh deploy_main MERCASTO
bash scripts/server-operator.sh restart_frontend MERCASTO
bash scripts/server-operator.sh restart_stack MERCASTO
bash scripts/server-operator.sh cleanup_docker MERCASTO
```

## Safety rules

1. Do not paste secrets, `.env`, access tokens, private keys, or Clip credentials into logs.
2. Do not run destructive commands outside `/var/www/mercasto`.
3. Keep GitHub as source of truth: production must converge to `origin/main`.
4. Use `verify_quick` after production-changing work.
5. Prefer PR + `automerge` label for normal agent work.
6. Use direct server operation only for deployment, production verification, diagnostics, controlled restarts, and emergency recovery.

## Auto-merge policy

PRs can be auto-merged only when:

- the PR has the `automerge` label;
- the PR is not draft;
- the author association is `OWNER`, `MEMBER`, or `COLLABORATOR`;
- no blocking label is present: `wip`, `blocked`, `do-not-merge`, `security-hold`, `production-hold`;
- GitHub reports the PR as merge-ready.

Manual auto-merge dispatch requires `confirm=MERCASTO`.

## Recommended AI-agent workflow

1. Create a branch.
2. Make a narrow change.
3. Run relevant local checks.
4. Open PR.
5. Add `automerge` only for low-risk, reviewed, gated changes.
6. Let CI merge when green.
7. Use **Server Operator → deploy_main** only when a production deploy/reconcile is needed.
8. Use **Server Operator → status** and **verify_quick** after deployment.

## Emergency workflow

Use direct server operation only when production is degraded and GitHub-based deploy is too slow or blocked.

After emergency recovery:

1. Capture what changed.
2. Commit the final state back to GitHub.
3. Run `verify_quick`.
4. Run `security_smoke`.
5. Confirm `git status --short` is clean except ignored runner data.
