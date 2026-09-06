# Privacy retention approval packet — 2026-09-06

**Status: PENDING LEGAL/OWNER. NO PRODUCTION PRUNING IS AUTHORIZED.**

This packet turns issue #504 into a reviewable table-by-table decision record. It does not approve any deletion window, create a pruning executor, or authorize schema/data mutation. Current production evidence must be refreshed with `scripts/privacy-retention-dry-run.sh` before any future approval or implementation.

## Decision matrix

| Dataset | Purpose | Sensitivity | Owner / legal basis | Candidate minimum | Candidate raw maximum | Technical state |
| --- | --- | --- | --- | --- | --- | --- |
| `ad_impressions` | attribution, abuse diagnostics, aggregate analytics | activity + pseudonymous network fingerprint | PENDING LEGAL/OWNER | incident/fraud review window | 30–90d engineering candidate | PENDING; global `created_at` batch index review required |
| `ad_views` | listing analytics and abuse diagnostics | activity + pseudonymous fingerprint | PENDING LEGAL/OWNER | incident/fraud review window | 30–90d engineering candidate | PENDING; `created_at` batch index review required |
| `ad_clicks` | conversion attribution | activity + pseudonymous fingerprint | PENDING LEGAL/OWNER | attribution/debug window | 30–90d engineering candidate | PENDING; global age index absent |
| `contact_clicks` | contact conversion analytics | activity; historical raw-IP-shaped values exist | PENDING LEGAL/OWNER | attribution/debug window | 30–90d engineering candidate | PENDING; historical raw values must not be exposed |
| `banner_impressions` | campaign delivery/analytics | activity telemetry | PENDING LEGAL/OWNER | campaign/debug window | 30–90d engineering candidate | PENDING; global age index review required |
| `user_notifications` | user-facing operational history | account activity + message text | PENDING LEGAL/OWNER | unread/current lifecycle | read-only records: PENDING | PENDING; unread rows must be protected initially |
| `ad_moderation_decisions` | safety, appeal, dispute evidence | moderation metadata | PENDING LEGAL/OWNER | appeal/dispute lifecycle | PENDING LEGAL/OWNER | PENDING; no automatic prune |
| `email_trackings` | delivery/campaign diagnostics | recipient email, network/user-agent metadata | PENDING LEGAL/OWNER | delivery/debug window | 30–90d engineering candidate if enabled | PENDING; leading `created_at` index exists |
| `users.ip_address` | registration abuse controls | account-linked network fingerprint; 5 historical raw-shaped rows | PENDING LEGAL/OWNER | account/security lifecycle | PENDING LEGAL/OWNER | NO PRUNING; data-minimization migration only after approval |
| `user_consents.ip_hash` | consent evidence | pseudonymous network fingerprint + legal evidence | PENDING LEGAL/OWNER | consent evidence lifecycle | PENDING LEGAL/OWNER | NO PRUNING without legal approval |
| `personal_access_tokens` expired | authentication | credential metadata | SECURITY/PRODUCT OWNER PENDING | active token lifecycle | expired-only candidate | PENDING; leading `expires_at` index exists |
| `personal_access_tokens` never-used | authentication | credential metadata | SECURITY/PRODUCT OWNER PENDING | product/security lifecycle | aged never-used candidate | PENDING; `created_at` age index review required |
| `payments` / refunds | payment, refund, accounting, disputes | financial/audit data | PENDING LEGAL/BUSINESS OWNER | statutory/business requirement | PENDING LEGAL/BUSINESS OWNER | **NEVER short-term auto-prune** |

## Current aggregate snapshot

On 2026-09-06 the read-only dry-run reported: `ad_impressions` 14,798 total / 302 >90d; `ad_views` 2,995 / 14 >90d; `ad_clicks` 1; `contact_clicks` 10 with 10 raw-IP-shaped historical rows; `user_notifications` 412 with 408 unread; `ad_moderation_decisions` 29,849; `personal_access_tokens` 531 with 0 expired and 18 never-used >90d; `payments` 32 with 0 >365d. These are evidence only, not retention approvals.

## Index-readiness evidence

Run `bash scripts/privacy-retention-index-readiness.sh`. A future pruning implementation must not assume that a composite index with `created_at` later in the key order supports a global age-only bounded batch. `NO_LEADING_INDEX` is a blocker for that candidate path until a reviewed query plan or safe index migration proves otherwise.

## Approval fields required before first prune

For each dataset selected for future pruning, record: named policy owner; legal/business basis; exact minimum and maximum window; protected-row rules; aggregate-preservation requirement; approved age column; reviewed bounded-batch query plan; backup/restore evidence; rollback/incident owner; and approval date/reference.

No blank or `PENDING` field may be interpreted as approval. Payments/refunds, consent evidence, moderation/audit evidence, unread notifications, active tokens, and current account records remain excluded unless their specific approval explicitly says otherwise.

## First-prune engineering gate

Before any destructive executor is merged: refresh count-only dry-run evidence; require fresh offsite backup plus restore drill; prove the age predicate is index-supported; add tests for protected rows; bound rows/time per batch; use retry-safe checkpoints; record rows/duration/WAL/database-size impact; and preserve only privacy-safe aggregates where raw identifiers are no longer needed.
