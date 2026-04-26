# Mercasto Stabilization Backlog

Purpose: define what remains before returning to normal feature development.

## Current stable state

- Mercasto opens on iOS Safari and Chrome.
- API category endpoint returns JSON.
- The iOS `Notification` runtime crash has been patched.
- Production deploy workflows have been reduced to manual paths.
- Runner health and secret rotation are tracked in separate issues.

## Completed recovery items

- Restored frontend boot on iOS.
- Added inline `Notification` fallback in `index.html`.
- Added pre-React `Notification` fallback in `src/lib/notificationPolyfill.js`.
- Added deploy workflow runbook.
- Added post-recovery smoke checklist.
- Added runner health runbook.
- Added secret rotation checklist.
- Added PR-only frontend quality gate for build and recovery guard checks.
- Disabled or reduced noisy workflows during stabilization.

## Open stabilization tasks

1. Complete smoke validation from issue #77.
2. Repair server GitHub runner from issue #75.
3. Rotate exposed deploy SSH credential from issue #79.
4. Confirm `SERVER_HOST` uses IPv4 while IPv6 routing is unreliable.
5. Verify the manual SSH frontend deploy works with the rotated credential.
6. Decide whether to keep or remove reserve server-runner workflows after runner repair.
7. Keep AI/model workflows disabled until deploy and runner health are stable.

## Return-to-feature-development gate

Resume UI, analytics, AI, monetization, and large refactors only after:

- smoke checklist passes;
- runner repair is complete or server-runner workflows are removed;
- exposed deploy credential is rotated;
- one manual frontend deploy is verified with the new credential;
- Actions page is readable and not flooded with unrelated failures;
- frontend PR quality gate is green on new frontend changes.

## Feature work currently paused

- analytics wiring beyond safe helper files;
- auto-apply/auto-accept automation;
- AI model deployment workflows;
- large UI refactors;
- database schema changes;
- payment or monetization changes;
- production security hardening that requires server changes.

## Safe work allowed during stabilization

- documentation;
- issue grooming;
- small CI trigger cleanup;
- non-runtime runbooks;
- smoke test tracking;
- planning tasks for later implementation;
- PR-only quality checks that do not deploy production.
