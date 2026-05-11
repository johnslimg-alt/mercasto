# Autonomous Delivery Runbook

Mercasto is operated in autonomous delivery mode.

## Operating model

1. Small, low-risk operational fixes may be committed directly to `main`.
2. Product, payment, database, auth, security, or deployment changes should use a pull request.
3. Pull requests may be labeled `automerge` after an operating agent verifies that the change is clear, scoped, and not blocked.
4. Blocking labels are `wip`, `blocked`, and `do-not-merge`.
5. Failed checks must be investigated before retrying or merging.

## Safety rules

Never commit secrets, runner credentials, local environment files, database dumps, runtime state, or production backups.

Ignored runtime paths include:

- `runners/data*/`
- `runners/backup-*.tgz`
- `runners/.env`

## Auto-merge workflow

Workflow: `.github/workflows/automerge.yml`

Required PR label: `automerge`

Merge method: `squash`

The workflow uses first-party GitHub CLI commands and the repository `GITHUB_TOKEN`. It resolves the PR number, verifies that the PR is open, non-draft, labeled `automerge`, free of blocking labels, and in a merge-ready state, then merges with `--match-head-commit` so the merge is rejected if the PR head changes after validation.

The workflow relies on GitHub pull request readiness and required checks. It must not be used to bypass failing checks or unresolved blockers.

## Production verification baseline

After deployments, confirm that public health, homepage, category API, sensitive path probes, route smoke checks, copy scan, and container health are green.

Expected production posture:

- public pages and APIs return successful responses;
- sensitive paths are not exposed;
- internal service ports are not publicly reachable;
- application containers stay healthy;
- public copy scan remains clean.
