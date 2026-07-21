# Paid traffic recovery and attribution

Mercasto protects paid landing sessions in two ways:

1. **Same-route chunk recovery**
   - Detects stale Vite chunk failures from browser errors, rejected imports, and the React error boundary.
   - Clears Cache Storage and unregisters stale service workers.
   - Reloads the same ad or publication route with a temporary cache-buster.
   - Uses a two-minute loop guard and marks persistent error pages `noindex`.
   - Emits `frontend_chunk_recovered` after a healthy reload.

2. **Campaign attribution through registration**
   - Stores first-touch, last-touch, and current-session attribution for 30 days.
   - Supports UTM parameters plus Meta, TikTok, Google, and Microsoft click identifiers without copying raw click IDs into analytics events.
   - Enriches both plain data-layer events and `gtag('event', ...)` payloads.
   - Measures `seller_post_intent`, `seller_post_returned_after_auth`, and `seller_post_intent_abandoned`.

## Marketing interpretation

Use the three seller funnel events to calculate:

- Registration return rate = `seller_post_returned_after_auth / seller_post_intent`
- Intent abandonment rate = `seller_post_intent_abandoned / seller_post_intent`
- Technical recovery rate = `frontend_chunk_recovered / paid landing sessions`

Segment these metrics by `attribution_source`, `attribution_medium`, and `attribution_campaign` before changing campaign budgets.
