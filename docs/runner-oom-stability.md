# Runner OOM stability

## Incident

On 2026-09-10 the self-hosted runner on `srv1526037` was killed by the Linux OOM
killer. Breakdown at the time:

| Signal | Value |
| --- | --- |
| Forgotten Vite processes | 41 |
| RSS held by those processes | ~11.6 GiB |
| Host swap | fully consumed |
| Available RAM after manual cleanup | 14–19 GiB |

The processes came from ad-hoc agent sessions and scratch worktrees under
`/root/mercasto-*` and `/tmp/mercasto-*`. Their launcher shells had exited, the
Vite servers had been reparented to PID 1, and nothing in the repository or on
the host reaped them. Every abandoned worktree therefore leaked memory until the
host ran out.

The same leak was observed again on 2026-09-11 (38 orphans, 5.1 GiB) and was
reclaimed with `scripts/runner-orphan-cleanup.sh --apply`.

## What now protects the host

| Layer | Artifact | Effect |
| --- | --- | --- |
| Detection and reaping | `scripts/runner-orphan-cleanup.sh` | Finds stale Vite/Playwright/browser processes and stops them |
| Automatic schedule | `mercasto-runner-orphan-cleanup.timer` (every 15 min) | Reaps without a human in the loop |
| Memory gate | `scripts/runner-memory-preflight.sh` | Refuses to start a heavy suite when RAM is already low |
| Provisioning | `ops/runner/runner-provision.sh` | Re-creates restart policy, cgroup kill and OOM bias on any runner host |

### Orphan definition

`runner-orphan-cleanup.sh` only considers a process when **all** of these hold:

1. the command line looks like a test runtime (`vite`, `vite preview`,
   `vite-node`, Playwright worker, `chrome-headless-shell` under
   `~/.cache/ms-playwright`);
2. the command line or working directory belongs to the Mercasto scope
   (`--scope mercasto`, the default);
3. it is older than `--max-age` (script default 1800s, scheduled default
   14400s / 4h);
4. it has no live Playwright driver anywhere in its ancestry — a server that a
   test session is still driving is never touched;
5. no GitHub Actions job that started after it is still running;
6. it is not the cleanup process itself, its ancestors, PID 1, or container /
   database / AI infrastructure.

Dry-run is the default. `--apply` is required to signal anything, and the
signal path is `SIGTERM` → grace period → `SIGKILL`.

## Operator commands

```bash
# Read-only audit: what would be reaped, and how much RAM it holds
bash scripts/runner-orphan-cleanup.sh

# Machine-readable audit + non-zero exit when orphans exist (CI audit mode)
bash scripts/runner-orphan-cleanup.sh --json --fail-on-orphans

# Reclaim everything older than four hours
sudo bash scripts/runner-orphan-cleanup.sh --apply --max-age 14400

# Reclaim aggressively while the host is under pressure
sudo bash scripts/runner-orphan-cleanup.sh --apply --max-age 0 --ignore-active-jobs

# Check memory before starting a heavy suite
bash scripts/runner-memory-preflight.sh --min-available-mb 4096

# Provision (or re-provision) a runner host; dry-run first
sudo ops/runner/runner-provision.sh --dry-run
sudo ops/runner/runner-provision.sh --apply
```

## Thresholds

| Variable | Default | Meaning |
| --- | --- | --- |
| `MERC_RUNNER_ORPHAN_MAX_AGE_SECONDS` | `14400` (timer), `1800` (script) | Minimum age before a process counts as an orphan |
| `MERC_CI_MIN_AVAILABLE_MB` | `4096` | MemAvailable required before a browser shard starts |
| `MERC_CI_MIN_SWAP_FREE_MB` | `0` | Warn below this much free swap |
| `MERC_RUNNER_OOM_SCORE_ADJUST` | `500` | Bias the OOM killer towards the runner instead of production containers |
| `MERC_RUNNER_MEMORY_HIGH` | unset | Optional systemd `MemoryHigh` ceiling for the runner unit |

The scheduled cleanup is deliberately conservative (4h). A browser shard or a
manual QA session is shorter than that, so live work is never interrupted, while
day-old leaks are still removed automatically.

## Where the guards are wired in

* `scripts/server-operator.sh` — `verify_quick` fails fast when memory is below
  the floor instead of racing the OOM killer.
* `scripts/frontend-quality-shard.sh` — every browser shard checks first.
* `scripts/run-isolated-launch-e2e.sh` — the isolated stack (database + API +
  Ollama stub + browser) checks before it starts containers.
* `.github/workflows/runner-stability.yml` — every 20 minutes: audit, reap,
  enforce the critical 2 GiB floor, and snapshot runner health.
* `scripts/static-safety-scans.sh` — runs the regression tests for all of the
  above as part of `verify:quick`.

## Restarting a runner kills the job it is running

Restarting a runner unit does not wait for the current job: the listener gets a
shutdown signal and the job ends with

```
##[error]The runner has received a shutdown signal. This can happen when the
runner service is stopped, or a manually started runner is canceled.
```

That happened twice on 2026-09-11 (06:32 and 14:29 UTC) from an external SSH
session restarting `actions.runner.*` units. It killed unrelated CI jobs — a
merge gate and a 20-minute Android release build — which then had to be re-run.

Use the guarded restart instead of `systemctl restart`:

```bash
# Report only (default): waits until the watched repositories have no queued or
# running runs, then prints the restart it would perform.
bash scripts/runner-safe-restart.sh \
  --unit actions.runner.johnslimg-alt-mercasto.srv1526037.service

# Actually restart, after the same wait; refuses after --wait seconds of busy.
sudo bash scripts/runner-safe-restart.sh \
  --unit actions.runner.johnslimg-alt-mercasto.srv1526037.service --apply

# Bypass the wait (a maintenance window you own), and watch other repositories.
sudo bash scripts/runner-safe-restart.sh --unit <unit> --force --apply \
  --repos "johnslimg-alt/mercasto johnslimg-alt/mercasto-mobile"
```

`ops/runner/runner-provision.sh` follows the same rule: it installs drop-ins
without restarting the runner unless `--restart-runners` is passed explicitly.
