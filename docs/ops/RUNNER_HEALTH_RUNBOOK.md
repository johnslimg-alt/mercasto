# Mercasto Runner Health Runbook

Purpose: keep the Mercasto self-hosted GitHub Actions runners healthy, reproducible, and safe to use for production gates.

## Known runner architecture

The production runner stack uses three Dockerized GitHub runners:

- `gh-runner-1`
- `gh-runner-2`
- `gh-runner-3`

Canonical Compose file:

```text
runners/docker-compose.runners.yml
```

Runtime configuration is loaded from a root-only environment file outside the repository:

```text
/root/.mercasto-runner.env
```

That file must not be copied into the repository, issue comments, workflow logs, or docs.

Each runner must have isolated persistent runner data and an isolated temporary work tree. The production pattern is:

| Runner | Persistent data | Work directory |
| --- | --- | --- |
| `gh-runner-1` | `/var/www/mercasto/runners/data1` | `/tmp/runner1/work` |
| `gh-runner-2` | `/var/www/mercasto/runners/data2` | `/tmp/runner2/work` |
| `gh-runner-3` | `/var/www/mercasto/runners/data3` | `/tmp/runner3/work` |

The production checkout must also be visible inside runner containers at:

```text
/var/www/mercasto
```

This is required because the deploy workflow changes into that path directly.

## Original symptom

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
- multiple runner containers sharing a broken workdir;
- runner re-registration attempted with stale state.

## Current stable pattern

The stable runner pattern is:

- repository-scoped runners;
- reusable runner state enabled;
- automatic deregistration disabled;
- automatic runner self-update disabled during controlled production operation;
- one persistent data directory per runner;
- one temporary work directory per runner;
- production checkout mounted at the same absolute path used by deploy workflows.

## Immediate production rule

If runner jobs fail before workflow steps start, do not treat it as an app regression.

Use this order:

1. Confirm production status using server-local gates where available.
2. Check runner logs.
3. Recreate only runner temp/work directories if needed.
4. Restart only runner containers.
5. Trigger a harmless diagnostic or repository-safety workflow first.
6. Use production deploy workflow only after the diagnostic path is healthy.

## Safe repair checklist

Run repair only during a maintenance window or after taking a server snapshot.

Recommended checks:

1. Check disk and inode pressure.
2. Check runner containers and recent logs.
3. Verify runner data directories exist.
4. Verify runner work directories exist.
5. Verify the production checkout is mounted into each runner at `/var/www/mercasto`.
6. Verify runner containers are not repeatedly restarting.
7. Trigger a harmless workflow before any production deploy.

## No-repo-state rule

These must stay out of git:

```text
runners/data*/
runners/backup-*.tgz
runners/.env
```

Use `.git/info/exclude` or `.gitignore` protections to avoid accidental commits of local runner state.

## Verification commands

Useful server-local checks:

```bash
docker ps -a --filter name=gh-runner
bash scripts/server-gate.sh status
bash scripts/server-gate.sh quick
```

A healthy runner should show that it is listening for jobs and should not fail before workflow step execution.

## Do not do

- Do not run destructive Docker cleanup during production recovery.
- Do not remove PostgreSQL, Redis, storage, certificate, runner data, or backup volumes during routine runner repair.
- Do not run database migrations as part of frontend or runner recovery unless the deploy workflow explicitly requires it and gates are green.
- Do not publish private runner configuration values.
- Do not re-enable aggressive deploy automation until runner health is verified.

## Long-term improvements

- Add a lightweight workflow that exercises the self-hosted runner without deploying.
- Keep production deploy and production checks separate.
- Keep runner data paths persistent and isolated.
- Keep server-local gates documented in `docs/ops/PRODUCTION_VERIFICATION_COMMANDS.md`.
