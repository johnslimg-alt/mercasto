# Runner provisioning

`runner-provision.sh` makes the self-hosted GitHub Actions runner survivable on a
rebuilt or additional VPS. Everything it writes is idempotent, so it is safe to
re-run after a host change.

```bash
# Show the plan (safe everywhere, including hosts without systemd)
ops/runner/runner-provision.sh --dry-run

# Apply as root
sudo ops/runner/runner-provision.sh --apply

# Only one runner unit
sudo ops/runner/runner-provision.sh --apply \
  --runner-unit actions.runner.johnslimg-alt-mercasto.srv1526037.service
```

## What it installs

| Path | Purpose |
| --- | --- |
| `/etc/systemd/system/<runner>.service.d/60-restart-policy.conf` | `Restart=on-failure`, `RestartSec=10s`, `KillMode=control-group` so stopping the runner also stops its children |
| `/etc/systemd/system/<runner>.service.d/70-oom-protection.conf` | `OOMScoreAdjust=500` (and optional `MemoryHigh`) so the kernel prefers the CI runner over production containers |
| `/etc/systemd/system/mercasto-runner-orphan-cleanup.service` | One-shot reap of orphaned Vite/Playwright processes |
| `/etc/systemd/system/mercasto-runner-orphan-cleanup.timer` | Runs the cleanup every 15 minutes and 10 minutes after boot |
| `/etc/mercasto-runner/stability.env` | Shared thresholds read by the timer service |

The unit templates in this directory contain two placeholders that the
provisioner substitutes:

* `__REPO__` — absolute path of the Mercasto checkout (default: the repository
  the provisioner lives in).
* `__CLEANUP_INTERVAL__` — systemd timer interval (default `15min`, override with
  `--cleanup-interval`).

Do not copy the templates to `/etc/systemd/system` by hand: the placeholders are
not valid unit syntax.

## Verify afterwards

```bash
systemctl list-timers mercasto-runner-orphan-cleanup.timer
systemctl show -p Restart -p RestartSec -p KillMode -p OOMScoreAdjust \
  actions.runner.johnslimg-alt-mercasto.srv1526037.service
bash /var/www/mercasto/scripts/runner-orphan-cleanup.sh     # dry-run audit
```

See `docs/runner-oom-stability.md` for the incident this prevents, the orphan
definition, and the thresholds.
