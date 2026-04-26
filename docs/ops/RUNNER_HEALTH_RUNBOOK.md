# Mercasto Runner Health Runbook

Purpose: record the GitHub runner problem observed during the iOS production recovery.

## Symptom

GitHub Actions jobs using the server runner failed before normal workflow steps started with this error:

`Could not find file '/tmp/runner/_temp'`

## Meaning

This is not a Mercasto frontend, backend, Laravel, PostgreSQL, or Docker application error.

It means the GitHub runner environment on the VPS is broken before the job can run its steps. Typical causes include:

- missing runner work directory;
- wrong ownership or permissions on the runner work directory;
- runner container volume path missing;
- stale or invalid runner workdir mapping;
- disk cleanup removed the runner temp directory;
- multiple runner containers sharing a broken workdir.

## Immediate production rule

Do not use server-runner workflows while this error is present.

Prefer the manual GitHub-hosted SSH workflow named:

`Emergency SSH Frontend Deploy`

Expected repository secrets:

- `SERVER_HOST`
- `SSH_KEY`

`SERVER_HOST` should be IPv4 if DNS points to an unreachable IPv6 address.

## Safe repair checklist

Run repair only during a maintenance window or after taking a server snapshot.

Recommended checks:

1. Check disk and inode pressure.
2. Check runner containers and their recent logs.
3. Verify the runner work directory exists.
4. Recreate the missing temporary directory if needed.
5. Restart runner containers.
6. Trigger a harmless diagnostic workflow before any production deploy.

## Safer long-term fix

Move runner work directories out of temporary paths and into persistent directories, for example under `/opt/github-runners/`.

Then update `infra/github-runners/docker-compose.runners.yml` so each runner has a separate persistent workdir volume.

## Do not do

- Do not run destructive Docker cleanup during production recovery.
- Do not remove PostgreSQL, Redis, storage, or certbot volumes.
- Do not run migrations as part of frontend recovery.
- Do not use old SSH keys exposed in chat.
- Do not re-enable auto-deploy-on-push until runner health is verified.

## Verification

A healthy server runner should start a simple diagnostic workflow and create its temporary directory without failing before step execution.

After repair, run only a harmless diagnostic workflow first. Do not test with a production deploy workflow as the first check.
