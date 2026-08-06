# Mercasto frontend rollback decision tree

## Purpose

Use this decision tree for frontend-visible production incidents. It covers blank screens, broken API calls, stale assets/cache, failed frontend deploys, and mobile-only runtime failures.

A rollback is a repository and deployment action. Do not commit, reset, or push from `/var/www/mercasto`, and do not edit built files inside a running container.

## Roles

| Role | Responsibility |
| --- | --- |
| Incident commander | Reliability/DevOps operator; classifies impact, pauses related merges, selects rollback or hotfix, and records the final decision. |
| Frontend owner | Identifies the first bad frontend commit, validates route/chunk/cache behavior, and prepares the smallest revert or fix. |
| Backend owner | Confirms API health and contract compatibility when the browser reports failed requests. |
| QA owner | Reproduces the failure on affected desktop/mobile surfaces and runs the post-change browser matrix. |
| Security/payments owner | Must review incidents involving auth, private data, payments, CSP, or security headers before traffic is considered safe. |

One person may fill several roles during a small incident, but the evidence must name the acting owner for each decision.

## First five minutes

1. Stop merging changes related to the failing surface.
2. Record the current production commit and workflow runs.
3. Check the public shell and core APIs without mutating data:

```bash
curl -fsS https://mercasto.com/up
curl -fsS -o /dev/null -w '%{http_code}\n' https://mercasto.com/
curl -fsS -o /dev/null -w '%{http_code}\n' https://mercasto.com/api/categories
curl -fsS -o /dev/null -w '%{http_code}\n' 'https://mercasto.com/api/ads?page=1'
```
4. Check container health and recent deploy status.
5. Classify the incident using the table below. Do not call an API outage a frontend-only incident.

## Decision table

| Symptom | Primary owner | Immediate next action | Rollback threshold |
| --- | --- | --- | --- |
| Blank screen or route shell crash | Frontend owner | Compare homepage/API status, browser console, and latest frontend commit. | Roll back when a new frontend release blocks a public or conversion route and no smaller verified fix is ready. |
| Browser API calls fail | Backend owner | Verify the same endpoint with curl and compare request/response contract. | Roll back the release that introduced the contract mismatch; do not hide a backend outage with fallback UI. |
| Stale assets or cache/chunk error | Frontend owner + Reliability | Inspect HTML cache headers, asset hashes, and missing chunk responses. | Prefer a clean rebuild/roll-forward; roll back when the current HTML references unavailable assets or users remain trapped on broken chunks. |
| Frontend deploy failed | Reliability/DevOps operator | Keep the last healthy container/image serving traffic and inspect the failed workflow. | Roll back only if a partial deployment reached production or the current container is unhealthy. |
| Mobile-only runtime/layout failure | QA + Frontend owner | Reproduce on the affected supported viewport/browser and compare desktop. | Roll back when login, publish, contact, payment, or navigation is blocked for a supported mobile audience. |

## Branch A — blank screen

- If `/up`, categories, or ads API is not healthy, escalate as a full production incident.
- If APIs are healthy, inspect the browser console, failed chunks, route shell, and the last frontend-affecting commit.
- Prefer reverting the first bad commit instead of stacking speculative changes.
- A cosmetic issue that does not block navigation or conversion may use a small hotfix, but the incident commander must record why rollback was not chosen.

## Branch B — broken API calls

- Reproduce the endpoint outside the browser with the same method and safe non-secret headers.
- Confirm whether the failure is network/edge, authentication, validation, frontend request shape, or backend response shape.
- If a frontend deploy calls a removed or renamed API contract, revert the frontend change or restore compatibility in a separately reviewed backend fix.
- Never retry state-changing payment, publish, delete, or upload calls blindly.

## Branch C — stale assets or cache

- Check `Cache-Control` on HTML separately from content-hashed assets.
- Confirm the HTML references assets that return 200 and match the current release.
- Prefer rebuilding/redeploying with new asset hashes over telling users to clear browser data.
- Do not enable a service worker, broad cache purge, or long-lived HTML caching as an incident shortcut.
- Follow `docs/ops/CACHE_AND_FRONTEND_ROLLBACK_POLICY.md` for cache-specific constraints.

## Branch D — failed frontend deploy

- If the workflow failed before container replacement and the existing frontend is healthy, keep serving the current release and fix the branch.
- If a partial deployment left the frontend unhealthy, revert the bad commit through GitHub and run the normal deployment workflow.
- Do not repair production by copying `dist/` files or editing nginx/container files manually.
- Preserve the failed run logs before rerunning or superseding the deployment.

## Branch E — mobile-only failure

- Reproduce on the affected viewport and browser family; record whether it is runtime, layout, input, upload, or navigation related.
- Check `/`, `/listings`, listing detail, `/post`, and `/profile` where relevant.
- If a supported mobile user cannot register, publish, contact a seller, or complete a payment flow, treat it as rollback-severity even when desktop is healthy.
- For non-blocking visual defects, use a focused hotfix plus desktop/mobile regression coverage.

## Safe rollback workflow

1. Identify the first bad commit and the last known-good production commit.
2. Create a revert commit in a clean repository checkout or GitHub branch. Do not modify the production checkout directly.
3. Open a small PR with Summary, Risk, Smoke, and Rollback sections.
4. Require the applicable frontend, recovery, production, and browser gates.
5. Merge the revert and let `Deploy Mercasto` perform the production update.
6. Confirm `Production checks`, `Public Smoke Check`, `Autonomous Production Watch`, and `Autonomous Server Live Gate` are green.

For an urgent security or payment incident, the incident commander may prioritize an immediate revert, but the revert must still be recorded in Git history and followed by the full verification chain.

## Completion criteria

Rollback or hotfix is complete only when:

- the affected route and user journey are reproduced as fixed;
- homepage, health, categories, and ads APIs return expected statuses;
- frontend and relevant containers are healthy;
- no new browser console error or horizontal overflow appears on the affected viewport;
- `npm run build` and `npm run verify:quick` pass where applicable;
- post-deploy public and server gates are green;
- the issue records incident start/end, acting owners, bad commit, recovery commit, workflow evidence, and remaining risk.

## Evidence template

```text
Incident:
UTC start/end:
Affected routes/devices:
Incident commander:
Frontend owner:
Backend owner (if applicable):
QA owner:
First bad commit:
Last known-good commit:
Decision: rollback | roll-forward hotfix | no code change
Recovery commit:
Deploy/check runs:
Remaining accepted risk:
```
