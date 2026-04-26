# Mercasto Ops Recovery Summary

## Current status

Mercasto is back online on iOS Safari and Chrome after the production frontend recovery.

Known-good checks reported during recovery:

- `https://mercasto.com` opens.
- `/api/categories` returns JSON.
- The iOS `Notification` runtime crash is resolved by frontend fallbacks.

## Main incident symptoms

1. iOS Safari and Chrome showed a critical frontend error instead of the app.
2. The backend API continued returning JSON.
3. Multiple GitHub Actions workflows created noisy failures.
4. Self-hosted runner jobs failed before normal steps with the temporary directory error.
5. SSH deploy initially attempted IPv6 and failed when IPv6 routing was unreachable.
6. Frontend container restart failed once due to a certbot mountpoint conflict.

## Fixes merged

Key recovery and stabilization PRs:

- PR #71: added `backend/certbot/.gitkeep` so the frontend container has the certbot mountpoint.
- PR #72: added pre-React `Notification` fallback.
- PR #73: added inline `Notification` fallback in `index.html` before app bundle loading.
- PR #74: stabilized deploy workflows after recovery.
- PR #76: added runner health runbook.
- PR #78: added post-recovery smoke checklist.
- PR #80: added secret rotation checklist.
- PR #82: added stabilization backlog and disabled AI Autopilot during stabilization.
- PR #83: added recovery guard checks.
- PR #84: added frontend quality gate.

## Current safe deploy rule

Production deploy must remain manual during stabilization.

Preferred manual workflow:

`Emergency SSH Frontend Deploy`

Expected GitHub Actions secrets:

- `SERVER_HOST`
- `SSH_KEY`

Important:

- Use IPv4 for `SERVER_HOST` while IPv6 routing is unreliable.
- Do not use exposed SSH keys.
- Do not run database migrations for frontend recovery.

## Workflows policy

Allowed:

- PR-only quality workflows.
- Manual frontend deploy workflow.
- Manual reserve workflows only after runner health is fixed.

Not allowed during stabilization:

- automatic production deploy on every push;
- AI model workflows that pull models or restart containers;
- self-hosted runner deploys while runner health is unknown;
- workflows that touch DB, payments, secrets, or migrations without a dedicated runbook.

## Open issues

- #75: repair server GitHub runner temp directory.
- #77: run post-recovery smoke checks on iOS and API.
- #79: rotate exposed deploy SSH credential.
- #81: complete stabilization backlog before feature work resumes.

## Agent squads

Use these GitHub labels and issues as agent lanes:

- PM/Ops: stabilization gate, runbooks, issue sequencing.
- QA: smoke checks, iOS browser checks, API checks.
- DevOps: runner health, deploy workflow simplification, secret rotation support.
- Security: exposed credential rotation and secret hygiene.
- Frontend: recovery guards, Vite build quality, iOS compatibility.
- Product/UX: paused until stabilization gate passes.
- AI: disabled until deploy and runner health are stable.

## Return to feature development only after

1. Smoke checklist passes.
2. Server runner is repaired or server-runner workflows are removed.
3. Exposed deploy credential is rotated.
4. Manual frontend deploy works with the rotated credential.
5. Actions page is readable and not flooded with unrelated failures.
6. Frontend PR quality gate is green on new frontend changes.

## Next recommended phase

After stabilization closes, proceed in this order:

1. UX polish for mobile classifieds flows.
2. SEO for category/listing pages.
3. Monetization with Clip payments.
4. Admin moderation and reports.
5. AI features after deploy path is stable.
