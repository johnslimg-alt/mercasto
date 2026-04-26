# Mercasto Deploy Workflows

This document records the safe workflow setup after the iOS production recovery.

## Current production status

- Mercasto opens on iOS Safari/Chrome.
- `/api/categories` responds correctly.
- The white-screen crash was resolved by the inline `Notification` fallback in `index.html` and the pre-React polyfill in `src/lib/notificationPolyfill.js`.

## Primary manual deploy path

Use this workflow for frontend production deploys:

```text
Emergency SSH Frontend Deploy
```

Expected secrets:

```text
SERVER_HOST
SSH_KEY
```

Important:

- `SERVER_HOST` should be the IPv4 address when DNS resolves to an unreachable IPv6 address.
- The workflow deploys only the frontend container.
- It does not run database migrations.

## Reserve workflows

### Emergency Container Frontend Patch

Manual-only reserve workflow.

Use only if SSH is unavailable but the self-hosted runner is healthy.

Known failure mode:

```text
Could not find file '/tmp/runner/_temp'
```

That means the self-hosted runner is broken before job steps start. In that case, do not use this workflow until the runner is repaired.

### Deploy Mercasto Frontend Hotfix

Manual-only self-hosted deploy workflow.

Do not use while the self-hosted runner is unstable.

### Emergency Frontend Deploy

Legacy manual-only self-hosted deploy workflow.

Do not use unless the self-hosted runner has been repaired and the main SSH deploy is unavailable.

## Disabled workflows

These are intentionally disabled or no-op during recovery:

- AI Model Deploy
- AI Factory Audit

Do not re-enable AI or model workflows until production deploy is stable and verified.

## Rule after recovery

Do not add automatic production deploys on every push until:

1. self-hosted runner health is fixed;
2. the deploy path is tested at least once manually;
3. frontend smoke checks pass on iOS Safari and Chrome;
4. workflows are reduced to one standard deploy and one emergency fallback.
