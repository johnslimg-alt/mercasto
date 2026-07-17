# Intelligent ad moderation

## What changes

- Every new or materially edited ad receives a dedicated `moderation_submitted_at` timestamp.
- The oldest submissions are processed first.
- AI can return `approved`, `manual_review`, or `rejected`; low-confidence results always fall back to a person.
- Every AI and administrator decision is stored in `ad_moderation_decisions`.
- Ads are never automatically deleted.
- Ads without seller photos receive a branded SVG cover marked `Imagen ilustrativa`.
- When a seller later uploads a real photo, the illustrative cover is removed automatically.

## Hidden review lifecycle

The database already permits `archived` as a hidden, non-public ad status. Intelligent moderation uses it only while `ai_moderation_status` is unfinished (`queued`, `processing`, `manual_review`, `failed`, or `admin_manual_review`). This prevents the older inline moderator from racing the audited job without changing the database status constraint.

Completed outcomes are:

- `active` + `approved` for published ads;
- `rejected` + `rejected` for prohibited ads;
- `archived` + `manual_review` for ads that still require an administrator.

A seller cannot activate an unfinished moderation item. A normally archived ad whose previous moderation was already approved is not added back to the moderation queue.

## Runtime

The scheduler dispatches up to 100 pending ads every five minutes:

```bash
php artisan ads:moderate-pending --limit=100
```

Jobs use the existing default Laravel queue worker and the configured `GEMINI_API_KEY`.

## Admin UI

Open `/admin` and use the **Moderación inteligente** control. It shows:

- exact submission date and time in `America/Mexico_City`;
- waiting duration;
- oldest-first queue order;
- full ad, seller, attributes and images;
- AI reason, confidence and complete decision history;
- manual approve, leave pending, reject with reason, and retry AI actions.

## Rollback

Revert the feature PR and run the migration down only if the moderation audit history is no longer required. Reverting application code without rolling back the migration is safe because the added columns and audit table are additive.
