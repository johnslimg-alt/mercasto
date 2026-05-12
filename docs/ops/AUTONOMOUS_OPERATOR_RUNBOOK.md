# Mercasto Autonomous Operator Runbook

This runbook defines how CEO/Major, HR, Claude Code, Codex, MCP, and QA agents should move Mercasto production work without creating hidden risk or founder manual coordination.

## Operating mode

Agents may work autonomously, but every production change must stay small, reviewable, reversible, and gate-driven.

Do not imitate progress. Either make a concrete repository change, run a concrete verification, or record a blocker with exact evidence.

## Priority order

1. P0/P1 security, payment, data retention, auth, deploy, and public exposure risks.
2. Production gate reliability: `verify:quick`, server smoke, security smoke, route smoke, copy scan, SEO/AEO smoke.
3. Revenue-critical flows: listing creation, listing detail, Clip checkout, coupons, moderation, seller contact.
4. SEO/AEO and marketplace trust signals.
5. UI polish and conversion improvements.

## Required gates

Use the strongest gate that is proportionate to the change.

For code touching production runtime:

```bash
npm run gate:prod
```

For server-side verification:

```bash
bash scripts/server-operator.sh status
bash scripts/server-operator.sh verify_quick
bash scripts/server-operator.sh security_smoke
bash scripts/server-operator.sh seo_aeo_smoke
```

For deploy from the server operator:

```bash
bash scripts/server-operator.sh deploy_main MERCASTO
```

For payment/data-retention changes:

```bash
npm run check:payment-retention
npm run verify:quick
```

## Agent roles

### CEO/Major operator

- Chooses the next lane and scope.
- Keeps changes atomic.
- Stops broad rewrites when a smaller safe path exists.
- Requires a rollback note for deployable changes.

### HR/Agent coordinator

- Converts vague work into narrow issues.
- Assigns each lane a gate and acceptance criteria.
- Keeps duplicate or obsolete issues closed or linked.
- Avoids asking the founder for routine command copying.

### Claude Code / Codex implementation agent

- Reads the issue body and this runbook first.
- Makes the smallest safe patch.
- Does not touch secrets.
- Does not combine unrelated features.
- Includes Summary, Risk, Smoke, and Rollback in PRs.

### Security / QA agent

- Prefers read-only probes.
- Checks public exposure, protected paths, route behavior, copy leaks, and SEO/AEO metadata.
- Files exact findings with endpoint, status, and reproduction command.

## Auto-merge policy

GitHub repository auto-merge may not be enabled. If native auto-merge is unavailable, use this controlled substitute:

1. Open a narrow PR.
2. Wait for required checks.
3. Confirm no secrets or broad rewrites.
4. Merge only after green checks.
5. Deploy with `server-operator.sh deploy_main MERCASTO` only when deploy is required.
6. Run post-deploy verification.

Never auto-merge:

- auth, payment, KYC, migration, secret, or Docker/networking changes without explicit gate evidence;
- dependency/runtime major upgrades;
- generated broad rewrites;
- changes that remove or weaken security probes.

## Forbidden actions

- Do not print secrets, tokens, `.env`, private keys, cookies, or credentials.
- Do not commit runner data, backups, logs, or `.env` files.
- Do not disable gates to pass a PR.
- Do not make direct production changes without a rollback path.
- Do not delete financial/audit data unless the lane explicitly requires and documents it.

## Server runner notes

Self-hosted GitHub runners must be able to see `/var/www/mercasto` and Docker.

Healthy runner log target state:

```text
Listening for Jobs
```

If runner reuse breaks, restore with the runner compose file and a valid GitHub access token outside the repo. Never store the token in tracked files.

## Definition of done

A lane is done only when all are true:

- repository change is merged or intentionally not needed;
- relevant gate passes;
- production smoke passes if runtime behavior changed;
- issue has evidence or commit references;
- rollback is clear.
