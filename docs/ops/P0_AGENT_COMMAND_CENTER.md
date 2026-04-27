# P0 Agent Command Center

Purpose: coordinate autonomous Mercasto stabilization work without unsafe production actions.

## Current mission

Close P0 stabilization before feature development resumes.

Primary epic:

- #92 P0 Epic: close stabilization gate before feature work

## Active P0 blockers

1. #77 Smoke checks
2. #79 Deploy credential rotation
3. #88 Security credential lane
4. #98 Deploy verification after rotation

## Active agent lanes

### PM/Ops Agent

Issue: #85

Mission:

- keep the P0 gate sequenced;
- prevent feature work before stabilization closes;
- update #92 when blockers change.

Allowed:

- issues;
- docs;
- PRs that do not change runtime behavior;
- CI safety checks that do not deploy.

Forbidden:

- SSH;
- production deploy;
- database changes;
- payment changes;
- secret handling outside secure stores.

### QA Agent

Issues: #77, #86, #103

Mission:

- validate public homepage and API smoke checks;
- record iOS Safari/Chrome manual evidence;
- keep results in GitHub issues.

Allowed:

- public URL checks;
- `Public Smoke Check` workflow;
- scheduled daily public smoke checks;
- screenshots or written pass/fail notes without secrets.

Forbidden:

- server access;
- deploy;
- data deletion;
- credential handling.

### Scheduled Public Smoke Agent

Workflow: `Public Smoke Check`

Mission:

- run daily public homepage/API checks through GitHub-hosted runners;
- provide early warning if public homepage or public API routes stop responding.

Allowed:

- read-only public URL checks;
- scheduled GitHub-hosted workflow runs;
- manual workflow runs.

Forbidden:

- SSH;
- secrets;
- server-runner;
- deploy;
- database writes;
- payment actions.

### Security Agent

Issues: #79, #88

Mission:

- rotate exposed deploy credential through secure storage;
- verify old credential is revoked;
- ensure no secret values appear in issues, docs, logs, screenshots, or chat.

Allowed:

- runbook updates;
- issue tracking;
- verification checklist updates.

Forbidden:

- posting secret values;
- reusing exposed credentials;
- weakening deploy controls.

### Deploy Verification Agent

Issue: #98

Mission:

- verify the deploy path after credential rotation.

Required order:

1. `Deploy Secret Presence Check`
2. `Emergency SSH Frontend Deploy`
3. `Public Smoke Check`
4. iOS Safari and Chrome manual confirmation

Allowed:

- manual workflow status tracking;
- issue comments with pass/fail results;
- public smoke evidence.

Forbidden:

- server-runner workflows;
- automatic production deploy on push;
- migrations;
- payment changes.

### DevOps Agent

Issues: #75, #87

Mission:

- repair or retire server-runner workflows;
- keep server-runner workflows disabled until verified.

Allowed:

- plans;
- runbooks;
- PRs that disable unsafe workflows;
- diagnostic-only workflow proposals.

Forbidden:

- destructive Docker cleanup;
- production deploy through broken runner;
- database volume changes.

### Frontend Agent

Issue: #89

Mission:

- protect iOS recovery fixes;
- keep build and recovery guards green;
- avoid large UI refactors until P0 closes.

Allowed:

- CI guard updates;
- small compatibility fixes with tests;
- docs.

Forbidden:

- removing `Notification` fallbacks before a tested replacement;
- large redesigns before stabilization gate passes.

## Safe autonomous actions

Agents may proceed without extra approval for:

- documentation;
- GitHub issues;
- PRs that only change docs or non-deploy CI checks;
- public smoke checks;
- scheduled read-only public checks;
- workflow changes that reduce deploy risk;
- comments that record status and next actions.

## Human/secure-channel actions

These require secure handling outside ordinary chat/issues:

- creating new private deploy keys;
- updating GitHub Actions secrets;
- removing old keys from server access;
- production deploy execution;
- database changes;
- payment configuration;
- firewall/security changes.

## Close P0 when

- #77 confirms smoke checks;
- #79/#88 confirm credential rotation without exposing values;
- #98 confirms manual deploy verification after rotation;
- #75/#87 are either repaired or server-runner workflows remain disabled;
- #92 records the final pass state.

## Next phase after P0

Only after P0 closes:

1. P1 reliability and monitoring;
2. P2 SEO and marketplace UX;
3. P3 Clip-only monetization;
4. P4 AI features with rollout gates.
