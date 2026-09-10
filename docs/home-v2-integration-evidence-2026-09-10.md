# Mercasto Home V2 integration evidence — 2026-09-10

Branch: `design/standalone-integration-20260910`

## Scope
- Production `/` remains unchanged.
- New design is isolated at `/design-v2`.
- V2 reuses production auth, API, listings, pricing, saved-search, card detail and analytics flows.
- V2 is `noindex,nofollow,noarchive` with canonical `/`.

## UX / design evidence
- Responsive checks: 320, 360, 390, 430, 768, 1024, 1440, 1920 px.
- Narrow-language checks: ES, RU, DE, FR, AR.
- RTL check: AR.
- Horizontal category / card rails scroll with hidden visual scrollbars.
- Custom V2 language dropdown scrolls internally with `scrollbar-width:none`.
- V2 palette uses lime / orange / teal plus neutral surfaces; no blue V2 accent.
- Light and dark mode accessibility checks passed.

## Localization
- 11 production languages checked in browser: ES, EN, PT, FR, ZH, KO, DE, IT, AR, RU, JA.
- All V2 `t.*` keys exist in every runtime language module.
- Added localized min/max price placeholders for all 11 languages.

## Functional evidence
- Production API-backed listing feed loads on V2.
- Search flows into the production catalog.
- Category CTA flows into production vertical routes.
- Pricing CTA opens the production PricingModal.
- Saved search uses the existing authenticated search-alert flow; unauthenticated users receive production login.
- Listing cards use the production detail flow.

## Accessibility
- axe WCAG A/AA/2.1 AA: 0 violations on:
  - 320 mobile light/dark
  - 390 mobile light/dark
  - 1440 desktop light/dark
  - open language dropdown

## Analytics
- V2 search is tagged with `source=design_v2`.
- Category and pricing interactions use the existing analytics layer.
- Analytics sanitizer regression fixed so `platform=web` is retained while PII keys remain redacted.

## Repository gates
Passed:
- `npm run build`
- `npm run lint:ci`
- `npm run i18n:audit`
- `npm run check:static-safety`
- `npm run check:security-audit`
- `npm run check:npm-audit-policy`
- `npm run smoke:legal-readiness`
- `npm run launch:status`

## Monetization consistency
PricingModal and PaymentProductsSeeder agree on:
- Impulso: 99 MXN/month
- Negocio: 249 MXN/month
- Pro: 599 MXN/month
- Agencia: from 1,499 MXN/month

## Existing launch blockers not introduced by V2
The repository launch-status summary still reports existing owner/operations blockers, including full-project UX audit, owner legal/business sign-off, DNSSEC/CDN-WAF scale decisions, staged Ubuntu maintenance and historical provider-side revocation evidence.

No production cutover is performed by this branch.
