# Release readiness

Review whether a Mercasto change is ready for production.

Check:
- branch status
- changed files
- dependency scope
- frontend build risk
- backend or database risk
- Docker and deploy risk
- payment and auth impact
- SEO/AEO impact
- security exposure
- rollback readiness

Output:

## Decision

Ready, ready with caution, or not ready.

## Blocking issues

List blockers.

## Required checks

List required CI jobs, commands, or public URLs.

## Production smoke

List exact public endpoints and commands.

## Rollback

Safe rollback plan.

## Next action

One concrete next action.

Do not recommend merge unless the required checks are green or the risk is explicitly scoped as documentation-only or CI-only.
