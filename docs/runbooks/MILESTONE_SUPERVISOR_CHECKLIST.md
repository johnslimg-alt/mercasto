# Mercasto Milestone Supervisor Checklist

Owner: Milestone Supervisor Agent

Purpose: decide whether an agent task can move forward, needs fixes, or must be blocked.

## Supervisor decision states

- PASS: task can move to next stage.
- FIX FORWARD: safe to continue, but follow-up issues are required.
- BLOCKED: must not proceed until fixes are complete.
- HUMAN GATE: requires human approval before merge, deploy, or execution.

## Universal gate

Every task must have:

- clear owner agent;
- objective;
- risk level;
- files or systems touched;
- two-step critique;
- definition of done;
- smoke tests or reason not needed;
- rollback plan if runtime behavior changes.

## Risk classification

### Low

Examples:

- documentation;
- copy without runtime behavior;
- planning;
- runbooks;
- issue templates.

Allowed path:

- Auto-Apply can open PR.
- Auto-Accept can merge if checks are clean.

### Medium

Examples:

- frontend UI behavior;
- backend non-sensitive endpoint changes;
- tests;
- non-destructive refactors.

Allowed path:

- PR required.
- QA checklist required.
- Supervisor approval required before merge.

### High

Examples:

- auth;
- payments;
- uploads;
- database migrations;
- Docker networking;
- public routes;
- admin paths;
- AI calls that process user content.

Allowed path:

- PR required.
- Security review required.
- Rollback plan required.
- Human approval needed before production deploy.

### Critical

Examples:

- secrets;
- SSH keys;
- destructive database operations;
- production deploy;
- DNS/domain changes;
- legal policy publication;
- exposing internal services.

Allowed path:

- Do not auto-execute.
- Create issue and runbook.
- Human approval and manual verification required.

## Two-step critique form

```markdown
## Critique 1: Risk and correctness

- What can break?
- What user path is affected?
- What sensitive system is touched?
- What is the rollback?

## Critique 2: Alternatives and quality

- Is there a simpler solution?
- Is the UX/copy good enough?
- Are tests and smoke checks enough?
- Are there better sequencing options?
```

## PR gate

Before merge, confirm:

- [ ] PR template is filled.
- [ ] Risk level is accurate.
- [ ] No secrets are present.
- [ ] No unrelated changes are included.
- [ ] Smoke tests are listed.
- [ ] Rollback plan exists when relevant.
- [ ] Any screenshots/evidence are attached for UI.
- [ ] Database and deployment notes exist when relevant.

## Deployment gate

Before production deploy, confirm:

- [ ] backup/snapshot is current;
- [ ] deployment command is known;
- [ ] rollback command is known;
- [ ] smoke test matrix is ready;
- [ ] monitoring path is ready;
- [ ] responsible operator is named.

## Block immediately if

- A private key, token, password, or secret is included.
- A PR changes public ports without explicit review.
- A PR touches payments or auth without review.
- A PR includes destructive database change without rollback.
- A PR mixes unrelated feature and infrastructure changes.
- A PR disables security checks.
- A PR lacks a way to validate success.

## Supervisor output

```markdown
# Milestone Supervisor Review

Task/PR:
Risk:
Decision: PASS / FIX FORWARD / BLOCKED / HUMAN GATE

## Critique 1

## Critique 2

## Required fixes

## Follow-up issues

## Next step
```
