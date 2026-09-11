# Mercasto funnel analytics contract

Contract version: `2026-08-04`.

Every first-party event includes `platform` (`web`, `mobile`, or `backend`) and `analytics_contract_version`. Event payloads may contain identifiers and categorical metadata, but never raw email, phone, passwords, OTPs, message text, descriptions, comments, precise coordinates, or access tokens.

## Canonical funnel

| Journey stage | Event | Required parameters |
| --- | --- | --- |
| Registration started | `sign_up_attempt` | `method` |
| Registration completed | `sign_up` | `method`, `event_id` when browser/server marketing deduplication applies |
| Registration failed | `sign_up_failed` | `method`, `error_type` |
| Publication started | `listing_publish_attempt` | `category` when known |
| Publication completed | `listing_published` | `listing_id`, `category` |
| Publication failed | `listing_publish_failed` | `error_type` |
| Search submitted | `search` | `search_term` when non-empty, optional `category`, `location_scope` |
| Listing opened | `listing_viewed` | `listing_id`, optional `category` |
| Contact CTA visible | `contact_cta_viewed` | `listing_id`, `channel` |
| Contact attempted | `contact_attempt` | `listing_id`, `channel` |
| External contact opened | `contact_opened` | `listing_id`, `channel` |
| Internal conversation started | `message_started` | `listing_id`, `seller_id`, `channel=internal` |
| Internal message sent | `message_sent` | `listing_id`, `seller_id`, `conversation_id` |
| Favorite added | `favorite_added` | `listing_id` |
| Verified payment | `purchase` | `transaction_id`, `value`, `currency` |

Legacy web method names such as `adViewed` and `adPosted` remain callable for compatibility, but emit the canonical event names above. Marketing-platform names (`ViewContent`, `PostAd`, `Contact`, `CompleteRegistration`, `Purchase`) are provider adapters, not first-party product event names.

## Registration deduplication

A new account receives one `register_user_*` event ID. The same ID is used by browser analytics and Meta/TikTok server events. Existing-user login never emits `sign_up` or `CompleteRegistration`.

Each registration channel has exactly one emitter of `sign_up`:

| Channel | `method` | `provider` | Emitter |
| --- | --- | --- | --- |
| Email/password | `email` | `password` | registration fetch interceptor in `src/utils/metaCapiBridge.js` |
| Google / OAuth | provider name from the server callback | provider name | `src/App.jsx` OAuth exchange branch |
| Phone/SMS | `phone` | `phone` | `src/App.jsx` phone verify branch |
| Telegram | `telegram` | `telegram` | `src/App.jsx` Telegram callback |

`src/App.jsx` must not emit a second `sign_up` for the email/password path: that POST is already observed once by the fetch interceptor. Failed attempts and logins emit nothing.

## Registration attribution

`sign_up` and the registration request itself carry the campaign attribution captured in the browser (`mercasto.attribution.first.v1` / `.last.v1`):

- `attribution_source`, `attribution_medium`, `attribution_campaign`, `attribution_content`, `attribution_term`
- `attribution_click_platform`, `attribution_channel`, `attribution_referrer_host`, `attribution_paid`, `attribution_ai_referral`
- `attribution_landing_path`, `attribution_captured_at`
- `first_touch_source`, `first_touch_medium`, `first_touch_campaign`, `first_touch_content`, `first_touch_term`, `first_touch_landing_path`, `first_touch_paid`

When no attribution touch exists the whole slice is omitted, so an organic registration is stored as unknown rather than as an empty campaign. The backend persists the slice in `user_registration_attributions` (one row per account) together with `registration_method`. These are campaign values, never personal data: values are whitelisted, length-capped and the capture timestamp must fall inside a bounded window.

## Authenticated identity

Every first-party event carries `user_id` (the numeric account id) once an authenticated user is known, so GA4 can stitch a session to an account. The account id is never an email, phone number or name. `phone_verified` is deliberately a custom provider event, not `CompleteRegistration`, because verifying a phone number is account activation and must not inflate registration conversions.
