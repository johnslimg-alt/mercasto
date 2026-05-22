# Launch workflows index

This file maps GitHub Actions workflows to launch gates and evidence issues.

## Production and deployment

| Workflow | Purpose | Evidence issue |
| --- | --- | --- |
| `.github/workflows/deploy-selfhosted.yml` | Existing self-hosted deploy workflow with manual dispatch | #262 |

## Repository-side launch control

| Workflow | Purpose | Evidence issue |
| --- | --- | --- |
| `.github/workflows/launch-artifact-inventory.yml` | Verifies required launch docs, scripts, E2E tests and workflows exist | #272 |
| `.github/workflows/launch-status-summary.yml` | Prints launch gate map, blocker map and stop conditions | #272 |
| `.github/workflows/e2e-public-smoke.yml` | Runs public Playwright smoke against `https://mercasto.com` | #263, #264, #270, #271 |

## Self-hosted readiness evidence

| Workflow | Purpose | Evidence issue |
| --- | --- | --- |
| `.github/workflows/env-readiness.yml` | Strict production env readiness check without printing secrets | #272 |
| `.github/workflows/sms-readiness.yml` | Strict SMS readiness check | #260 |
| `.github/workflows/category-data-readiness.yml` | Verifies category and attribute data readiness | #266 |
| `.github/workflows/backup-freshness.yml` | Verifies recent database backup artifact exists | #267 |

## Manual workflow order before soft launch

1. Run `Deploy Mercasto` if repo commits need to be synced to production.
2. Run `Launch Artifact Inventory`.
3. Run `Launch Status Summary`.
4. Run `Env Readiness Evidence`.
5. Run `Category Data Readiness`.
6. Run `SMS Readiness Evidence`.
7. Run `Backup Freshness Evidence`.
8. Run `Public E2E Smoke`.
9. Record evidence in issue #272 and linked blockers.

## Stop rules

Stop and do not proceed to public marketing if any of these fail:

- production health;
- direct frontend ownership of ports `80/443`;
- env readiness;
- SMS readiness;
- category data readiness;
- backup freshness;
- public E2E smoke;
- security pass;
- payment webhook evidence;
- legal/business readiness.

## Notes

- Some workflows run on `self-hosted` and therefore execute on the production runner. They must not print secrets.
- Restore drills must use staging or disposable databases only.
- The current production topology uses direct nginx/frontend ownership of `80/443`; do not enable host-level Traefik unless issue #261 is completed.
