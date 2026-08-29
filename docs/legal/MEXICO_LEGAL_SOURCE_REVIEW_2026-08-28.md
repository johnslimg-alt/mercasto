# Mexico legal source review — 2026-08-28

This document is a technical source/version checklist for Mercasto. It is not legal advice and does not record counsel approval.

## Current federal baselines

### Privacy / personal data

- Law: **Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)**.
- Current law was published in DOF on **2025-03-20**.
- Latest reform shown by Cámara de Diputados: **DOF 2025-11-14**.
- The former 2010 LFPDPPP was abrogated on 2025-03-20 and must not be the sole legal baseline for Mercasto copy or controls.
- Official current-law index: https://www.diputados.gob.mx/LeyesBiblio/ref/lfpdppp.htm
- Official current PDF: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf

Technical review targets:
- controller/contact identity and privacy-notice scope;
- purposes and categories of personal data actually processed;
- ARCO/right-request language and implemented contact/account flows;
- transfers/processors and analytics/payment-provider descriptions;
- security-incident wording so public copy does not promise an unsupported absolute deadline;
- retention statements aligned with the still-human-approved retention matrix in issue #504.

### Consumer protection / recurring billing

- Law: **Ley Federal de Protección al Consumidor (LFPC)**.
- Current Cámara de Diputados reference shows latest reform **DOF 2025-12-12** and 2026 amount updates published **2025-12-23**.
- Official current-law index: https://www.diputados.gob.mx/LeyesBiblio/ref/lfpc.htm
- Official current PDF: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPC.pdf
- Recurring-payment decree: https://www.dof.gob.mx/nota_detalle.php?codigo=5775999&fecha=12/12/2025

Article 76 Bis VIII–IX technical requirements relevant to any future Mercasto recurring subscription/membership flow:
1. clearly, prominently and accessibly disclose that charges are recurring;
2. disclose periodicity, amount and charge date;
3. obtain express and informed consumer consent for recurring charges;
4. where automatic renewal applies, notify at least **five calendar days** in advance and allow cancellation without penalty;
5. provide a mechanism allowing immediate cancellation of the service, subscription or membership.

## Current Mercasto product constraints

- Do **not** enable or describe recurring billing as production-ready until the purchase, renewal-notice and immediate-cancellation UX are verified against the requirements above and legal/product owners approve it.
- Existing one-off visibility/credit/payment flows must keep their copy tied to actual activation, cancellation and refund mechanics.
- Payment/refund retention remains outside automatic short-term pruning until legal/business approval.
- AI moderation remains assist-only; no model-only signal may become authoritative legal/moderation action.

## Repository/public-copy review checklist

| Surface | Technical source/version review | Human approval |
| --- | --- | --- |
| Privacy notice | Current 2025 LFPDPPP + 2025-11-14 reform baseline required | Qualified Mexico counsel pending |
| Terms | Match actual marketplace/payment/moderation behavior | Qualified Mexico counsel pending |
| Refund/payment policy | Match one-off charge, activation, failure and refund mechanics | Legal/business owner pending |
| Recurring billing | Must satisfy LFPC 76 Bis VIII–IX before enablement | Legal/product owner pending |
| Moderation policy | Canonical technical matrix exists; AI is non-authoritative | Qualified Mexico counsel pending |
| Retention | Aggregate dry-run tooling exists; destructive pruning blocked | Legal/business retention matrix pending |

## Release gates

Recurring billing is a **NO-GO** until all of the following are true:
- recurring-charge disclosure contains periodicity, amount and date;
- express informed consent is captured and auditable;
- renewal notification is implemented at least five calendar days before automatic renewal;
- immediate cancellation is implemented and tested;
- refund/cancellation copy matches actual behavior;
- qualified Mexico legal review and product-owner acceptance are recorded.

Public legal publication remains human-authoritative. Automation may verify implementation/source versions and block unsafe release paths, but must not fabricate legal approval or accepted legal risk.
