# Main branch protection

Mercasto `main` is PR-only. Direct pushes, force pushes and branch deletion are blocked, including for repository admins.

## Required merge gates

The protected branch requires the following exact-head checks before merge:

- `PR quality gate`
- `Build and recovery checks`
- `Repository safety gates`
- `Validate Docker Compose config`
- `Build frontend`
- `Build frontend Docker image`
- `Build backend Docker image`
- `SEO/AEO production smoke`
- `Production bearer and session security smoke`
- `Production error mode and leak smoke`
- `Live server gate verify_quick`

Required status checks use strict mode, so the PR branch must be up to date with `main` before merge.

## Frontend aggregate behavior

`Build and recovery checks` exists on every pull request. Frontend-relevant changes run the full static, Chromium matrix and WebKit suite. Changes outside the frontend scope skip the heavy jobs but still produce the aggregate check, preventing required-check deadlocks on documentation or infrastructure-only PRs.

## Merge policy

Squash merge is the normal merge method. No approval count is required for the current single-maintainer workflow, but a pull request is still mandatory. Conversation resolution is required when review threads exist.

## Verification and rollback

After changing branch protection, verify that a direct push to `main` is rejected and that a fully green, up-to-date PR can still squash merge. If protection configuration itself blocks every valid PR unexpectedly, restore the previously recorded protection JSON through the GitHub branch-protection API; do not bypass CI by force pushing.
