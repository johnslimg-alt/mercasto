# Mercasto autonomous agent operating model

Purpose: let CEO/Major, HR/coordination, Claude Code, Codex, server operators, QA, and security agents move Mercasto forward without founder hand-holding.

This is an operating model, not permission to bypass gates. Production safety remains gate-driven.

## Executive rule

Small, verifiable, reversible work wins. Broad rewrites require a gate plan and rollback notes before implementation.

## Roles

| Role | Mission | Allowed work | Required gates |
| --- | --- | --- | --- |
| CEO/Major operator | Prioritize lanes and decide safe next work. | Issue triage, release sequencing, small direct commits, PR reviews, gate reports. | Relevant gate from this document plus issue acceptance criteria. |
| HR/Agent coordinator | Turn open issues into scoped agent lanes. | Create/update issues, define acceptance criteria, split risky work into small follow-ups. | Docs-only review plus `npm run check:scripts` if scripts change. |
| Claude Code implementation agent | Implement one scoped patch at a time. | Narrow code/script/docs PRs. | `npm run verify:quick`; `npm run gate:prod` for runtime/security/payment/auth/media/route changes. |
| Codex/code agent | Perform focused repo edits and refactors. | Small source changes, tests, scripts, docs. | Same as Claude Code implementation agent. |
| Security agent | Guard public exposure and sensitive flows. | Smoke probes, deny rules, auth/session/payment/cache audits. | `npm run smoke:security`, `npm run smoke:public-manifests`, `bash scripts/static-safety-scans.sh`. |
| QA/product agent | Validate Spanish marketplace flows. | Launch smoke checklist, public copy, mobile matrix, listing/feed checks. | `npm run smoke:copy`, `npm run smoke:routes`, `npm run smoke:seo`. |
| Server operator | Run production-local gates and deploy-safe checks. | Status, quick/full gates, stack health, runner health, deploy only when requested by workflow or owner policy. | `bash scripts/server-gate.sh status`, `bash scripts/server-gate.sh quick`, or `bash scripts/server-gate.sh full`. |
| Payment agent | Preserve Clip payment correctness. | Checkout/webhook audit, idempotency scans, retention checks. | `npm run check:payment-retention`, `bash scripts/payment-webhook-idempotency-scan.sh`, `npm run verify:quick`. |
| Media agent | Preserve upload/storage safety. | Image/video validation audit, storage traversal checks, upload UX docs. | `bash scripts/media-upload-validation-scan.sh`, `npm run smoke:security`, `npm run verify:quick`. |
| SEO/AEO agent | Keep public discovery surfaces ready. | Metadata, sitemap/robots, structured data, Spanish search copy. | `npm run smoke:seo`, `npm run smoke:cache-headers`, `npm run smoke:copy`. |

## Default task routing

| Issue/work type | Primary owner | Secondary reviewer | Gate |
| --- | --- | --- | --- |
| Deploy or production infra | CEO/Major | Security agent | `npm run gate:prod` plus deploy workflow result. |
| GitHub runners | Server operator | CEO/Major | Self-hosted runner diagnostic workflow plus `bash scripts/server-gate.sh status`. |
| Public security probes | Security agent | CEO/Major | `npm run smoke:security` and `npm run smoke:public-manifests`. |
| Auth/session/CSRF | Security agent | Backend agent | `npm run check:session-config` and `npm run verify:quick`. |
| Payment/webhook | Payment agent | Security agent | Payment scans plus quick verification. |
| Media/upload | Media agent | Security agent | Media scan plus quick verification. |
| SEO/AEO | SEO/AEO agent | QA/product agent | SEO/copy/cache-header gates. |
| Spanish UI/product smoke | QA/product agent | CEO/Major | Launch smoke checklist plus copy/routes/SEO gates. |
| Docs/runbooks | HR/Agent coordinator | Relevant lane owner | Docs review; script syntax if scripts changed. |

## Standard commands

Repository root:

```bash
npm run check:scripts
npm run verify:quick
npm run gate:prod
bash scripts/static-safety-scans.sh
```

Server checkout:

```bash
bash scripts/server-gate.sh status
bash scripts/server-gate.sh quick
bash scripts/server-gate.sh full
```

Lane-specific:

```bash
npm run smoke:security
npm run smoke:public-manifests
npm run smoke:seo
npm run smoke:copy
npm run smoke:routes
bash scripts/media-upload-validation-scan.sh
bash scripts/payment-webhook-idempotency-scan.sh
```

## Auto-merge policy

Native auto-merge may be enabled only for a concrete PR when:

1. The PR is narrow and reversible.
2. Required checks for its lane are green.
3. It is not a major dependency/runtime upgrade.
4. It does not introduce a new production secret, private operational value, or unreviewed deploy path.
5. Runtime changes have rollback notes.

Do not add broad repo-wide merge automation that executes untrusted pull request code or merges without green gates.

## Work sizing

| Size | Allowed scope | Gate |
| --- | --- | --- |
| XS | Docs-only or comments | Review only; script syntax if scripts touched. |
| S | One script/check/doc update | Relevant script plus `npm run check:scripts`. |
| M | One runtime behavior patch | `npm run verify:quick`; full gate when security/payment/auth/media/infra. |
| L | Multi-file runtime change | Split into smaller patches unless unavoidable. Requires rollback notes. |
| XL | Stack migration or broad redesign | Needs dedicated issue, gate plan, and staged rollout. |

## Stop conditions

Agents must stop merging related work when:

- a required gate fails;
- production returns 5xx on core public endpoints;
- a change could expose private operational values;
- database-affecting work lacks backup/rollback clarity;
- payment/webhook behavior is ambiguous;
- nginx or deployment changes cannot be smoke-tested.

Stopping does not mean asking the founder for routine commands. It means opening or updating a blocker issue with the exact failing gate and smallest next action.

## Reporting template

Use this concise report in issues/PRs:

```text
Agent Report
Lane:
Change:
Gate run:
Result:
Risk:
Rollback:
Next:
```

## Current canonical runbooks

- `docs/ops/PRODUCTION_VERIFICATION_COMMANDS.md`
- `docs/ops/SMOKE_MATRIX.md`
- `docs/ops/RUNNER_HEALTH_RUNBOOK.md`
- `docs/ops/SPANISH_MARKETPLACE_LAUNCH_SMOKE.md`
- `docs/media-upload-safety.md`
