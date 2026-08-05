# Legal and business launch checklist

This checklist must be completed before public marketing. It does not replace legal advice; it records the product, policy and operational materials that must exist and be visible to users.

## Required public pages or policy surfaces

| Area | Requirement | Status |
| --- | --- | --- |
| Terms of service | Clear marketplace terms for buyers, sellers and visitors | Technical evidence complete; human review pending |
| Privacy policy | Data collection, account data, payments, analytics, support, retention | Technical evidence complete; human review pending |
| Cookie/analytics notice | Cookie/analytics disclosure and consent handling where applicable | Technical evidence complete; human review pending |
| Refund/payment policy | Payment flow, failed payment, refunds, promotion credits, manual recovery | Public page and smoke complete; owner sign-off pending |
| Moderation policy | Prohibited listings, reporting, takedown, repeat abuse handling | Public page and smoke complete; queue owner pending |
| Seller/business policy | Business profile expectations, verification, contact rules | Covered by current terms/moderation surfaces; human review pending |
| Support process | Support email/contact path and SLA expectation | Public contact path complete; monitored owner/SLA pending |
| Account deletion | User-visible delete-account process and retention notes | Complete and wired to authenticated deletion API |
| SMS/phone verification | Disclosure for OTP and phone number usage | Not planned; public phone/SMS functionality is disabled |

## Operational requirements

- Support mailbox or ticket process exists and is monitored.
- Moderation/report queue process exists.
- Payment recovery process is documented in `docs/payment-webhook-launch-runbook.md`.
- Privacy and payment policies do not promise features that are not implemented.
- Public pages are linked from footer/account/help surfaces.
- Policy copy is reviewed before public marketing.

## Launch evidence

Record evidence in the legal/business launch issue:

- public URLs for each page;
- screenshots or Playwright traces proving pages render;
- support contact route;
- refund/manual recovery owner;
- moderation owner/process;
- accepted legal risks.

## Stop conditions

Do not launch publicly if any are missing:

- privacy policy;
- terms;
- payment/refund policy;
- moderation/reporting policy;
- support contact path;
- account deletion path;
- SMS disclosure when SMS OTP is enabled.

## Verified technical evidence — 2026-08-04

Current verified production commit: `6bc3d7864690b634e84f05ae804d7b91b1f18710`.

- `REQUIRE_LEGAL_READY=1 bash scripts/legal-readiness-smoke.sh` passed against production.
- All eight required public routes returned 200.
- Refund/payment and moderation content markers were present.
- Playwright public launch smoke passed all legal routes on Desktop Chrome and Pixel 7.
- Profile account deletion requires explicit `ELIMINAR` confirmation and calls authenticated `DELETE /api/user`.
- Footer/help surfaces expose terms, privacy, cookies, support and safety links.

This evidence closes implementation/rendering gaps. It does **not** replace legal review or operational ownership. The remaining launch decisions are the monitored support owner/SLA, moderation owner, refund/manual-recovery owner, policy-copy approval or accepted risk. The SMS launch-mode decision is complete: phone/SMS functionality is not planned and remains disabled.
