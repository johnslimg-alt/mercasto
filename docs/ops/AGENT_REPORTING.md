# Agent Reporting

Purpose: keep autonomous work organized and auditable.

## Use these issue forms

- `Agent Task`: create a scoped task for an agent.
- `Agent Report`: record a result from an agent or workflow check.

## Reporting rules

Agent reports should include:

- related issue;
- result: pass, fail, blocked, or partial;
- summary;
- evidence link;
- next steps.

## Current P0 use

Use reports for:

- #102 browser verification;
- #103 API verification;
- #104 deploy readiness verification;
- #98 final verification.

## Keep reports clean

Do not include private values in reports. Link workflow runs, PRs, issue comments, screenshots without sensitive data, or public checks.

## Closeout rule

A task can close when:

- the result is posted;
- follow-up items are created if needed;
- the related P0 issue is updated.
