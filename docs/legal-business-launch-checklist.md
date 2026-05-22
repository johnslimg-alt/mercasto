# Legal and business launch checklist

This checklist must be completed before public marketing. It does not replace legal advice; it records the product, policy and operational materials that must exist and be visible to users.

## Required public pages or policy surfaces

| Area | Requirement | Status |
| --- | --- | --- |
| Terms of service | Clear marketplace terms for buyers, sellers and visitors | Open |
| Privacy policy | Data collection, account data, payments, analytics, support, retention | Open |
| Cookie/analytics notice | Cookie/analytics disclosure and consent handling where applicable | Open |
| Refund/payment policy | Payment flow, failed payment, refunds, promotion credits, manual recovery | Open |
| Moderation policy | Prohibited listings, reporting, takedown, repeat abuse handling | Open |
| Seller/business policy | Business profile expectations, verification, contact rules | Open |
| Support process | Support email/contact path and SLA expectation | Open |
| Account deletion | User-visible delete-account process and retention notes | Open |
| SMS/phone verification | Disclosure for OTP and phone number usage | Blocked until SMS launch readiness |

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
