# Deploy Verification After Credential Rotation

Purpose: define the safe verification process after replacing the deploy credential used by GitHub Actions.

## Preconditions

Before verification:

- the old exposed deploy credential has been removed from server access;
- the new deploy credential has been stored only in GitHub Actions secrets;
- the secret name remains `SSH_KEY`;
- `SERVER_HOST` points to the current IPv4 host while IPv6 routing is unreliable;
- production site currently opens on iOS Safari/Chrome.

## Workflow to use

Use only the manual workflow:

`Emergency SSH Frontend Deploy`

Do not use server-runner workflows until runner health is repaired and verified.

## Verification steps

1. Trigger `Emergency SSH Frontend Deploy` manually from GitHub Actions.
2. Confirm the workflow reaches frontend build.
3. Confirm the frontend container is running after the workflow.
4. Confirm the smoke check reaches the homepage.
5. Open `https://mercasto.com` on iOS Safari.
6. Open `https://mercasto.com` on iOS Chrome.
7. Confirm `/api/categories` returns JSON.
8. Confirm `/api/ads?page=1` returns JSON.
9. Confirm `/api/auth/providers` returns JSON.

## Pass criteria

The rotation is considered verified when:

- the manual workflow succeeds using the new credential;
- the old credential no longer grants access;
- the homepage opens on iOS Safari and Chrome;
- API smoke routes return JSON;
- no critical frontend error screen appears.

## Failure handling

If verification fails:

- do not re-enable old credentials;
- keep production deploy manual-only;
- record the failing workflow step in the linked issue;
- use the recovery summary and deploy workflow runbook to choose the next safe action.

## Scope boundary

This checklist does not authorize database changes, payment changes, destructive Docker cleanup, migrations, or production feature rollout.
