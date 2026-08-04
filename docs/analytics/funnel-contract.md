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
