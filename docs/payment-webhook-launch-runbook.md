# Payment webhook launch runbook

This runbook supports issue #265. It defines the evidence needed before public launch without requiring real card data in automated smoke tests.

## Goals

- Verify checkout creation path.
- Verify signed webhook acceptance.
- Verify invalid signature rejection.
- Verify duplicate webhook idempotency.
- Verify failed payment handling.
- Verify refund/manual recovery process.
- Confirm no payment secrets are printed in logs, browser output or CI artifacts.

## Existing automated guards

- `scripts/payment-webhook-idempotency-scan.sh`
- `scripts/payment-retention-scan.sh`
- `scripts/security-probes.sh`
- `scripts/env-readiness-smoke.sh`
- `docs/security-launch-checklist.md`

## Required evidence before launch

Record evidence in issue #265.

| Scenario | Required result | Evidence |
| --- | --- | --- |
| Checkout create | Provider request succeeds or clear provider-disabled message appears | HTTP/API output with secrets redacted |
| Signed webhook | Event accepted and state transition applied once | backend log/API output with IDs redacted |
| Invalid signature | Request rejected | HTTP status and log summary |
| Duplicate webhook | Second event is idempotent and does not double-credit | database/API state summary |
| Failed payment | User-visible failure path works | screenshot or Playwright trace |
| Refund/manual recovery | Operator steps documented | runbook output |
| Secret safety | No API key/secret/webhook secret in output | log review summary |

## Safe local/static checks

Run from repository root:

```bash
npm run check:payment-webhook-idempotency
npm run check:payment-retention
npm run smoke:security
REQUIRE_ENV_READY=1 npm run smoke:env-readiness
```

## Provider fixture strategy

Automated tests should use provider-approved sandbox fixtures or local signed payload fixtures only. Do not store live provider secrets or live payment identifiers in Git.

Fixture files, if added later, must:

- contain no live secrets;
- contain fake customer/payment identifiers;
- include both valid and invalid signature cases;
- assert idempotency by checking only non-sensitive state.

## Manual recovery checklist

1. Identify payment by internal payment/order ID.
2. Verify provider state in provider dashboard/API.
3. Compare Mercasto payment state and promotion/listing state.
4. Apply recovery action through an audited admin/operator path.
5. Record operator, timestamp, provider event ID and internal payment ID.
6. Re-run public smoke checks.

## Launch block

Do not close issue #265 until signed webhook, invalid webhook, duplicate webhook and failed payment evidence are attached.
