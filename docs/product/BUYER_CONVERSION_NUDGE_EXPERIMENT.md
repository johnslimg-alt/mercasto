# Buyer conversion nudge experiment

Issue: #548

The implementation is shipped **disabled by default**. `VITE_BUYER_NUDGE_ROLLOUT_PERCENT=0` means no visitor can see it. Activation requires an explicit frontend rebuild with a non-zero percentage and must happen only after launch stabilization.

## Audience and safety

The nudge is anonymous-only, mobile-safe, dismissible, and capped to one impression per browser every seven days. It never appears on authentication, publish, account/profile, admin, messages, notification, payment/checkout, pricing, referral, verification, moderation, or refund flows.

It does not read `auth_token`, does not create its own auth-return state, and does not revive the old `/post` state contract. The existing auth modal and `protectedRouteReturn` remain the only owners of authentication and protected-journey return behavior.

## Measurement

Every impression emits `buyer_nudge_impression`. Dismissal emits `buyer_nudge_dismissed`. The CTA emits `buyer_nudge_register_click` plus the canonical `sign_up_attempt` event with `source=buyer_nudge`. Existing `sign_up` then measures successful registration.

Primary metric: `sign_up / buyer_nudge_impression`. Guardrails: dismissal rate, frontend errors, auth completion rate, contact-open rate, and mobile layout regressions.

## Rollout and rollback

Start at 5% only after the launch tracker permits experiments. Increase only with clean guardrails and enough conversion volume. Rollback is immediate: rebuild with `VITE_BUYER_NUDGE_ROLLOUT_PERCENT=0`; no database migration or user-state cleanup is required.
