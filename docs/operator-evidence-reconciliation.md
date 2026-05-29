# Operator evidence reconciliation ledger

This document captures operator-reported production findings that still need reviewable, non-sensitive evidence before they can be used for launch decisions.

It does not approve public launch. It only prevents reported work from being lost while GitHub `main` and live production state are reconciled.

## Current repository baseline

Audited GitHub `main` commit:

```text
d7437ea852cd84ad43492aabfa8058825d09625a
```

Current gap:

- Several live-site improvements were reported by the operator.
- Matching commits or merged PRs were not found in GitHub search at the time of this ledger.
- These results must be attached as artifacts, screenshots, logs, or committed code before they can be treated as launch evidence.

## Reported live improvements needing attachment

- MCP SSE endpoint repaired.
- Daily SSL monitoring configured; one mail credential step remains.
- Lighthouse reportedly improved to Performance 91, SEO 92, Accessibility 88, and Best Practices around 90+.
- Frontend bundle splitting and prerendered HTML shell reportedly deployed.
- WebSocket/Reverb live-site issue reportedly fixed.
- Read-only database role for SQL agent reportedly created and write-denial tested.
- Confirm modal replacement work reportedly completed.

## Reported account onboarding investigation

Operator reported:

- Registration endpoint returns success.
- Account confirmation can complete in test mode.
- Background job processing ran for the confirmation flow.
- Account confirmation timestamp is set after the confirmation step.

Remaining evidence required:

- One fresh external user-facing account-confirmation proof.
- Non-sensitive command output or screenshot proving the confirmation state.
- No secret values, tokens, private links, passwords, or raw private logs should be attached.

## Reported E2E status

Latest operator report:

```text
72 tests total
40 passed
0 failed
32 skipped
```

Reported passing coverage:

- public smoke routes on desktop and mobile;
- legal page checks on desktop and mobile;
- health/API/sensitive-file/SEO checks;
- payment webhook signature checks for valid and invalid cases.

Reported skipped coverage:

- auth-flow browser group;
- ads-lifecycle browser group;
- payments browser group;
- `/reembolsos` and `/moderacion` page checks currently redirected.

Launch interpretation:

- This is useful smoke progress.
- The skipped groups do not close launch blockers for auth/account, ads lifecycle, or payments.
- Runnable flow evidence is still required before #263, #264, #265, or #293 can close.

## Reported weekly digest follow-up

Operator reported a separate digest job issue: the job references a relation that is not currently present.

Required follow-up:

- add the missing schema or adjust the job to an existing relation;
- run the digest command without that relation error;
- attach non-sensitive output.

## Evidence attachment rules

Attach only non-sensitive evidence:

- screenshots with private data redacted;
- command output with secrets removed;
- CI artifacts;
- Lighthouse reports;
- E2E reports;
- safe SQL command output that does not expose user personal data.

Never attach:

- tokens;
- private keys;
- passwords;
- raw environment files;
- raw private logs containing verification links or private user data.

## Launch status

Current launch status remains NO-GO until the master tracker is resolved with reviewed evidence.