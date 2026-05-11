# Mercasto Production Gate

This document defines the production gate that must be green before a change can be treated as production-ready.

## Executable gate

Run:

```bash
npm run gate:prod
```

The gate currently includes:

1. shell script syntax checks;
2. Docker Compose config validation;
3. recovery guard validation;
4. frontend production build;
5. production smoke/security/listing/route/SEO/copy verification.

## Required local/server gate command

```bash
npm run gate:prod
```

A change is not production-ready until this command passes on the target production checkout or an equivalent CI environment.

## Required GitHub branch/ruleset gate

The repository should protect `main` with a branch protection rule or ruleset requiring:

- pull request before merge;
- required status checks before merge;
- up-to-date branch before merge;
- required conversation resolution;
- no force pushes;
- no branch deletion;
- no bypass for normal collaborators;
- auto-merge only after required checks pass.

Recommended required checks:

- `Production checks / Validate Docker Compose config`;
- `Production checks / Build frontend`;
- `Production checks / Build frontend Docker image`;
- `Production checks / Build backend Docker image`;
- `Deploy Mercasto` only where deployment checks are intentionally part of the gate.

If job names are changed, update the branch/ruleset checks at the same time.

## Auto-merge rule

Auto-merge may be enabled only for safe automation PRs that satisfy all of these conditions:

- the PR is opened by Dependabot or another approved automation account;
- the update is patch or minor;
- required checks are green;
- the PR does not touch deployment secrets, runner state, generated credentials, local `.env` files, or backups;
- the PR does not weaken smoke/security checks;
- the PR does not modify `pull_request_target` workflows to checkout or execute untrusted PR code.

Major updates must remain manual-review changes with a rollback plan.

## Post-merge verification

Post-merge verification must use an explicit workflow dispatch or repository dispatch path when the merge is performed by GitHub Actions automation. Do not rely on ordinary push/pull_request events from `GITHUB_TOKEN`-initiated automation to start follow-up workflows.

## Manual settings still required when MCP cannot update repository settings

If automation cannot modify repository settings directly, configure this in GitHub UI:

1. Repository → Settings → Rules → Rulesets or Branches.
2. Target branch: `main`.
3. Enable pull request requirement.
4. Enable required status checks.
5. Add the required checks listed above after they have appeared at least once.
6. Enable require branches to be up to date before merging.
7. Disable force pushes and deletions.
8. Save the rule/ruleset in active/enforced mode.

This settings-level gate is the hard GitHub-side enforcement. The executable `npm run gate:prod` is the project-level gate used by agents, CI, and server verification.
