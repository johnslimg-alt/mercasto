# Mercasto Clip payment audit

Status: required audit before enabling or expanding monetization.

## Non-negotiable payment rule

Never activate paid features only because the user reached a success redirect page.

Payment truth must come from one of these server-side sources:

- verified Clip webhook;
- server-confirmed provider status from Clip API if used.

`/payment/success` and `/payment/fail` must remain UI-only pages.

## Required flows

### Checkout creation

Required behavior:

- verify authenticated user;
- verify product exists and is active;
- verify listing ownership for listing promotions;
- create local `payments` row with `pending` status;
- generate unique `external_reference`;
- create Clip checkout/payment link;
- save `checkout_url`, provider identifiers and provider payload;
- redirect user to payment URL.

### Webhook handling

Required behavior:

- read raw request body;
- verify webhook authenticity/signature when Clip supports it for the integration mode;
- parse payload safely;
- extract provider event id if present;
- enforce idempotency;
- resolve local payment by `external_reference` or provider payment id;
- store raw event in `payment_events`;
- map provider status to local status;
- apply business effect only after paid status is confirmed server-side.

### Idempotency

Required behavior:

- duplicate provider event must not apply business effect twice;
- paid payment must not be downgraded by late/duplicate events without explicit business logic;
- `applyBusinessEffectForPaidPayment()` must be safe to run more than once.

## Local status model

Recommended statuses:

- `pending`
- `processing`
- `paid`
- `failed`
- `cancelled`
- `expired`
- `refunded` later if needed

Final statuses:

- `paid`
- `failed`
- `cancelled`
- `expired`

## Public copy rules

Public UI should not expose implementation details unnecessarily.

Allowed public phrases:

- `Pago con tarjeta`
- `Pago en OXXO` only if supported by active checkout configuration
- `Pago seguro`

Avoid public provider branding unless product explicitly wants it.

Internal code may still use provider value `clip`.

## Security checks

Before enabling payments:

```bash
curl -I https://mercasto.com/payment/success
curl -I https://mercasto.com/payment/fail
curl -I https://mercasto.com/webhooks/clip
```

Expected:

- success/fail pages do not mutate local payment state;
- webhook endpoint does not reveal secrets or stack traces;
- invalid webhook payloads receive safe 4xx response;
- no raw provider secrets appear in logs.

## Database checks

Confirm these tables or Laravel migrations exist before live monetization:

- `payment_products`
- `payments`
- `payment_events`
- `user_listing_quotas` if listing packages are enabled

Confirm useful indexes exist for:

- payments by user/status;
- payments by listing;
- provider + external payment id;
- external reference;
- provider event id.

## Manual QA scenarios

### Happy path promotion

- seller owns listing;
- seller selects promotion;
- local payment created as pending;
- checkout URL generated;
- webhook paid event received;
- payment becomes paid;
- listing promotion flag/date is applied once.

### Duplicate webhook

- send same paid event twice;
- payment remains paid;
- business effect is not duplicated.

### Invalid ownership

- user tries to promote another user's listing;
- request is denied;
- no payment is created.

### Redirect-only fraud check

- open success URL manually without webhook;
- payment remains pending;
- paid feature is not activated.

## Definition of done

Payment layer is launch-ready only when:

- state changes are server-confirmed;
- webhook handling is idempotent;
- payment events are logged;
- paid business effects are applied exactly once;
- public copy is Spanish-first and does not leak internal provider details;
- invalid/duplicate webhook tests pass;
- rollback procedure for monetization exists.
