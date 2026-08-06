# Mercasto Analytics Event Map

Owner: Product Analytics Agent + CMO Agent + CFO Agent

Purpose: define the analytics events needed before paid traffic, SEO expansion, and monetization experiments.

## Principles

- Track business decisions, not vanity metrics only.
- Keep events stable and consistently named.
- Do not collect unnecessary personal data.
- Do not store private message content in analytics events.
- Use IDs and coarse metadata where possible.

## Naming convention

Use snake_case event names:

- `homepage_viewed`
- `search_submitted`
- `listing_viewed`
- `listing_published`

Recommended event payload convention:

```json
{
  "event": "listing_viewed",
  "event_version": "2026-08-04",
  "platform": "web",
  "source": "search",
  "event_id": "listing_viewed_opaque_id",
  "occurred_at": "2026-08-06T00:00:00Z",
  "language": "es",
  "user_id": "optional_internal_id",
  "listing_id": "required_when_applicable",
  "category": "optional_controlled_value",
  "city": "optional_public_or_coarse_value",
  "state": "optional_public_or_coarse_value"
}
```

### Required property rules

Every event must include this bounded envelope:

| Property | Requirement | Notes |
|---|---|---|
| `event_version` | Required | Stable contract version such as `2026-08-04`. |
| `platform` | Required | Controlled value: `web`, `ios`, `android`, or `huawei`. |
| `source` | Required | Controlled surface such as `homepage`, `search`, `listing`, `publish_flow`, `dashboard`, or `seo`. |
| `event_id` | Required | Opaque bounded identifier for deduplication; never a token or credential. |
| `occurred_at` | Required | ISO-8601 client or server timestamp. |
| `language` | Required | Supported UI language code. |
| `user_id` | Optional | Internal ID only when authenticated and allowed by the analytics destination. |

Properties in the event tables below are required when the trigger supplies that context. Omit unavailable optional context instead of sending empty strings, raw form values, or `null` placeholders. IDs must be internal bounded identifiers, not emails, phone numbers, addresses, tokens, or provider payloads.

## Core funnel events

### Discovery

| Event | Trigger | Key properties |
|---|---|---|
| `homepage_viewed` | User opens homepage | language, device, referrer |
| `category_selected` | User taps a category | category, source |
| `search_submitted` | User submits search | query_length, category, location_present |
| `filter_applied` | User applies filter | category, filter_type |
| `listing_card_clicked` | User opens listing from card | listing_id, category, source |

### Listing detail

| Event | Trigger | Key properties |
|---|---|---|
| `listing_viewed` | Listing detail opens | listing_id, category, seller_id, source |
| `contact_clicked` | User taps contact CTA | listing_id, category, contact_type |
| `share_clicked` | User taps share | listing_id, channel |
| `favorite_toggled` | User favorites/unfavorites | listing_id, action |
| `report_started` | User opens report flow | listing_id, reason_selected |
| `report_submitted` | User submits report | listing_id, reason |

### Authentication and account access

| Event | Trigger | Required properties |
|---|---|---|
| `auth_entry_viewed` | Login/register surface opens | intent, source |
| `sign_up_attempt` | User submits a registration method | method, consent_version, source |
| `sign_up` | Backend-confirmed account creation succeeds | method, account_type, source |
| `sign_up_failed` | Registration attempt fails | method, failure_class, source |
| `login_attempt` | User submits login or starts an OAuth exchange | method, source |
| `login` | Bearer-token login or OAuth exchange succeeds | method, two_factor_used, source |
| `login_failed` | Login, OAuth exchange, or 2FA challenge fails | method, failure_class, source |
| `password_reset_requested` | Password reset request is accepted or safely rejected | outcome_class, source |
| `logout` | Authenticated session/token is revoked client-side or server-side | source |

`sign_up_attempt`, `sign_up`, and `sign_up_failed` are the current canonical registration funnel names in `src/utils/funnelAnalytics.js`. The remaining auth names are the target contract for future implementation and must not be emitted under competing aliases.

Allowed `method` values should be controlled (`password`, `google`, `telegram`, `phone`, `apple`, or another reviewed provider). `failure_class` must be coarse, for example `invalid_credentials`, `consent_required`, `rate_limited`, `provider_unavailable`, `two_factor_invalid`, or `validation_failed`; never send the submitted identifier, raw provider error, password, OTP, recovery code, or validation payload.

### Seller funnel

| Event | Trigger | Key properties |
|---|---|---|
| `publish_started` | User opens publish flow | source, logged_in |
| `publish_category_selected` | Seller selects category | category |
| `publish_media_added` | Seller adds media | category, media_count |
| `publish_validation_failed` | Form validation fails | field, category |
| `listing_submitted` | Seller submits listing | category, has_media |
| `listing_published` | Listing becomes active | listing_id, category |
| `seller_dashboard_viewed` | Dashboard opens | listing_count |
| `listing_edit_started` | Seller starts edit | listing_id, category |
| `listing_status_changed` | Listing status changes | listing_id, from_status, to_status |

### Trust and moderation

| Event | Trigger | Key properties |
|---|---|---|
| `seller_profile_viewed` | Public profile opens | seller_id, source |
| `trust_badge_viewed` | Trust badge visible | badge_type, page |
| `moderation_queue_viewed` | Admin opens queue | queue_type |
| `moderation_action_taken` | Admin action | action_type, category |
| `kyc_flow_started` | User starts verification | account_type |
| `kyc_submitted` | User submits verification | account_type |

### Monetization interest

| Event | Trigger | Key properties |
|---|---|---|
| `boost_cta_viewed` | Seller sees boost CTA | listing_id, category, placement |
| `boost_cta_clicked` | Seller taps boost CTA | listing_id, category, package_hint |
| `pro_cta_viewed` | Seller sees PRO CTA | placement |
| `pro_cta_clicked` | Seller taps PRO CTA | placement |
| `pricing_page_viewed` | Pricing page opens | source |
| `payment_link_requested` | Seller requests payment link | product_type, amount_range |

### Vertical events

| Event | Trigger | Key properties |
|---|---|---|
| `autos_landing_viewed` | Autos page opens | city, state, source |
| `services_landing_viewed` | Services page opens | city, state, source |
| `vertical_filter_applied` | Vertical filter used | vertical, filter_type |
| `provider_contact_clicked` | Services provider contact | provider_id, service_type |

## Minimum analytics before paid traffic

Required before paid ads:

- homepage viewed;
- sign-up attempt, success, and failure;
- search submitted;
- listing viewed;
- contact clicked;
- publish started;
- listing submitted;
- listing published;
- seller dashboard viewed.

## Minimum analytics before monetization

Required before paid seller products:

- boost CTA viewed;
- boost CTA clicked;
- PRO CTA viewed;
- PRO CTA clicked;
- pricing page viewed;
- payment link requested;
- listing viewed;
- contact clicked.

## Privacy guardrails

Do not send:

- full message text;
- private document images;
- exact private address unless user made it public;
- full phone number;
- payment credentials;
- raw uploaded media data;
- access tokens;
- email addresses, phone numbers, passwords, OTP values, OAuth codes, 2FA secrets, or recovery codes;
- raw authentication/provider error messages or submitted form values.

Prefer:

- category;
- city/state;
- listing ID;
- seller ID;
- coarse source;
- boolean flags such as `has_media` or `two_factor_used`;
- controlled auth method, consent version, outcome class, and coarse failure class.

## Dashboards needed

### Marketplace health

- daily active users;
- listings submitted;
- listings active;
- listing views;
- contact clicks;
- search count;
- publish conversion.

### Seller funnel

- publish started;
- category selected;
- media added;
- listing submitted;
- listing active;
- dashboard viewed;
- boost interest.

### Trust and quality

- reports submitted;
- moderation actions;
- rejected listings;
- seller verification submissions;
- low-quality listing rate.

### Growth

- landing page views;
- SEO source traffic;
- category traffic;
- city traffic;
- contact clicks by source.

## Implementation recommendation

Phase 1: add a thin frontend analytics helper with safe no-op fallback.

Phase 2: track core funnel events.

Phase 3: add backend-confirmed events for publish/status changes.

Phase 4: connect dashboards.

Do not block MVP launch on a full analytics platform, but do not start paid ads without the minimum funnel events.

## AI referral attribution

Every data-layer event can include the bounded fields `attribution_source`, `attribution_medium`, `attribution_channel`, `attribution_referrer_host`, and `attribution_ai_referral`. Identifiable ChatGPT, Perplexity, Claude, Gemini, and Microsoft Copilot visits use `ai_referral`; only the referrer hostname is retained by this layer, never the full referring URL or its query string.
