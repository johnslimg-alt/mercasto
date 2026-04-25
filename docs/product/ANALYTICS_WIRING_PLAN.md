# Mercasto Analytics Wiring Plan

Owner: Product Analytics Agent + Frontend Lead Agent

Purpose: connect the safe analytics helper gradually without risking the main marketplace flows.

## Current state

- `src/lib/analytics.js` exists.
- It is safe by default and supports no-op behavior.
- It is not wired into UI flows yet.

## Wiring principles

- Wire events in small PRs.
- Do not send private text, phone numbers, private documents, or raw media.
- Prefer IDs, categories, city/state, source, and boolean flags.
- Add events near the user action, not in unrelated global code.
- Keep each PR easy to smoke test.

## Phase 1: navigation and discovery

Events:

1. `page_viewed`
2. `homepage_viewed`
3. `category_selected`
4. `search_submitted`
5. `filter_applied`

Recommended implementation:

- Add route/page event in a small hook or useEffect.
- Add category and search events in existing handlers.
- Do not refactor `App.jsx` at the same time.

QA checks:

- Homepage renders.
- Category click still works.
- Search still works.
- No console errors.
- With `VITE_ANALYTICS_DEBUG=true`, events print in console.

## Phase 2: listing detail and contact intent

Events:

1. `listing_card_clicked`
2. `listing_viewed`
3. `contact_clicked`
4. `share_clicked`
5. `favorite_toggled`

QA checks:

- Listing card opens detail page.
- Favorite action still works.
- Share/contact actions still work.
- No private contact values are sent as analytics payload.

## Phase 3: seller funnel

Events:

1. `publish_started`
2. `publish_category_selected`
3. `publish_media_added`
4. `publish_validation_failed`
5. `listing_submitted`
6. `seller_dashboard_viewed`
7. `listing_edit_started`

QA checks:

- Publish form still opens.
- Validation still works.
- Image upload still works.
- Dashboard still works.

## Phase 4: monetization interest

Events:

1. `boost_cta_viewed`
2. `boost_cta_clicked`
3. `pro_cta_viewed`
4. `pro_cta_clicked`
5. `pricing_page_viewed`

QA checks:

- No payment behavior changes.
- CTAs still route to existing UI.
- No sensitive payment data is emitted.

## Phase 5: dashboards

After events are wired, define dashboards:

- buyer funnel;
- seller funnel;
- listing quality;
- vertical performance;
- monetization interest.

## First implementation PR recommendation

Start with only:

- `page_viewed`
- `homepage_viewed`
- `category_selected`

Do not include publish/payment/admin events in the first PR.

## Rollback

If analytics wiring causes any issue, revert the small PR. Since helper is isolated, rollback should not affect backend or data.
