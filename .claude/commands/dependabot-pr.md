# Dependabot PR review

Review the current Dependabot pull request for Mercasto.

Output exactly these sections:

## Summary

Summarize the dependency update and files changed.

## Risk

Classify risk as low, medium, or high. Identify whether the update is runtime, build tooling, Docker, GitHub Actions, or backend.

## Smoke

List required checks and any observed passing or failing checks.

## Rollback

Explain how to revert safely.

## Merge recommendation

Recommend merge only when the diff is understood and required checks pass. Do not recommend major Docker or runtime upgrades without a controlled validation plan.
