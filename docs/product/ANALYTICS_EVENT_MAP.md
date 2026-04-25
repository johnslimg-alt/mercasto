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
  "user_id": "optional",
  "listing_id": "required when applicable",
  "category": "optional",
  "city": "optional",
  "state": "optional",
  "source": "homepage|search|category|seo|dashboard",
  "timestamp": "server_or_client_timestamp"
}
```

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
- access tokens.

Prefer:

- category;
- city/state;
- listing ID;
- seller ID;
- coarse source;
- boolean flags such as `has_media`.

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
