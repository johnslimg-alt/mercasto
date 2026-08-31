# Privacy-safe retention draft — 2026-08-07

**Status: PENDING LEGAL/OWNER. NO PRODUCTION PRUNING IS AUTHORIZED.**

This document is an engineering draft, not a legal approval or a production deletion schedule. It intentionally separates count-only evidence from future retention decisions. Any automated pruning requires named policy ownership, legal/business approval where applicable, a reviewed migration/job, fresh off-host backup evidence, and a bounded rollback/incident plan.

## Current aggregate-only evidence

Production evidence was collected with aggregate counts only; no IP address, token, email, payment payload, notification body, or moderation metadata value was returned.

| Dataset | Total | Age / protection evidence | Identifier / sensitivity note |
| --- | ---: | --- | --- |
| `ad_impressions` | 14,798 | 3,095 >30d; 0 >90d | 14,798 rows contain IP addresses |
| `ad_views` | 2,995 | 81 >30d; 0 >90d | fraud/analytics telemetry |
| `ad_clicks` | 1 | 0 >30d; 0 >90d | 1 row contains an IP address |
| `user_notifications` | 384 | 244 >30d; 381 unread; 241 unread >30d | unread records must be protected by any first implementation |
| `ad_moderation_decisions` | 29,846 | 0 >30d | all rows contain metadata; audit/dispute value requires review |
| `email_trackings` | 0 | no current rows | schema can contain recipient email, IP, user-agent and metadata |
| `personal_access_tokens` | 919 | 0 expired; 28 never used; 0 never-used >90d | active credentials; raw token values must never be reported |
| `payments` | 32 | 0 >365d | financial/refund/audit evidence; no short-term automated pruning |

## Data-minimization update — 2026-08-31

A fresh aggregate-only format audit corrected an important distinction in the original inventory: a non-null `ip_address` column does not necessarily contain a raw network address. No identifier value was selected or printed during this audit.

Current production shape before this hardening change:

| Dataset | Total | >30d | >90d | Raw IP-shaped rows | Pseudonymous fingerprint rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ad_impressions` | 14,798 | 14,527 | 51 | 0 | 14,798 |
| `ad_views` | 2,995 | 2,995 | 11 | 0 | 2,995 |
| `ad_clicks` | 1 | 1 | 0 | 0 | 1 |
| `contact_clicks` | 10 | 10 | 0 | 10 | 0 |
| `banner_impressions` | 0 | 0 | 0 | 0 | 0 |
| `email_trackings` | 0 | 0 | 0 | 0 | 0 |

The 64-character values in the three `ad_*` telemetry tables are legacy unkeyed SHA-256 pseudonyms, not raw IP addresses. They still permit cross-dataset correlation and are weaker against guessing than keyed fingerprints, so new telemetry is being moved to APP_KEY-backed, purpose-scoped HMAC-SHA256 fingerprints. `contact_clicks` uses a 45-character HMAC truncation only because its existing schema is `varchar(45)`; this still provides a 180-bit pseudonymous identifier. Existing raw `contact_clicks` rows are left untouched pending the approved retention decision.

The transition keeps legacy values only as short-window **read-match compatibility** for anti-fraud/deduplication. New writes never persist the legacy SHA-256 form or raw IP in these internal telemetry paths. Banner click logs also stop writing raw IP. Transient network-address use that is required for request rate limiting or explicit external payment/analytics provider contracts is outside this at-rest telemetry change and is not silently altered here.

This is data minimization, not pruning. It does not authorize deletion or change any `PENDING LEGAL/OWNER` retention window below.

## Draft retention matrix

All windows below are **engineering candidates only**. `PENDING LEGAL/OWNER` means the value is not approved for production enforcement.

| Dataset | Purpose | Sensitivity | Policy owner / legal basis | Candidate minimum | Candidate raw maximum | First automated action allowed now |
| --- | --- | --- | --- | --- | --- | --- |
| impressions / views / clicks | attribution, abuse/fraud diagnostics, aggregate analytics | IP and activity telemetry | PENDING LEGAL/OWNER | enough for incident/fraud review | 30–90d candidate range; aggregate thereafter | none; count-only evidence |
| notifications | user-facing operational history | account activity and message text | PENDING LEGAL/OWNER | current/unread delivery lifecycle | read-only records may later use a bounded window; unread excluded initially | none; unread explicitly counted/protected |
| moderation decisions | safety, appeals, dispute/audit history | metadata may contain sensitive operational context | PENDING LEGAL/OWNER | appeal/dispute lifecycle | PENDING LEGAL/OWNER | none |
| email tracking | delivery/campaign measurement | recipient email, IP, user-agent, metadata | PENDING LEGAL/OWNER | delivery/debug window | 30–90d candidate raw window if tracking is enabled | none |
| personal access tokens | authentication | credentials and account linkage | security/product owner PENDING | active token lifecycle | expired tokens are the only initial technical candidate; never-used aging needs product approval | none |
| payments / refunds | payment state, refunds, accounting, disputes | financial/audit data | PENDING LEGAL/BUSINESS OWNER | statutory/business requirement | PENDING LEGAL/BUSINESS OWNER | **never** short-term auto-prune |

## Query/index readiness

Current production indexes support several application lookups but not every global age-only batch predicate. In particular, `user_notifications` is indexed by `(user_id, is_read, created_at DESC)`, `ad_clicks` lacks a standalone age index, and `payments` lacks a `created_at` index. No pruning implementation should be merged until representative bounded-batch plans are reviewed and an age predicate is demonstrably index-supported or a safe index migration is approved.

## Mandatory first-prune preflight

Before the first future production pruning job:

1. Run `bash scripts/offsite-backup-smoke.sh` and require fresh off-host state plus a successful restore drill.
2. Run `bash scripts/privacy-retention-dry-run.sh` and attach **aggregate counts only** to the change record.
3. Record policy owner and legal/business approval for the exact affected dataset and window.
4. Add tests proving active tokens, unread/current notifications, payment/refund/audit evidence, and required moderation records are excluded from deletion.
5. Use an indexed age predicate, bounded batches, retry-safe checkpoints, explicit row/time limits, and record rows/duration/WAL/size impact.
6. Preserve only privacy-safe aggregate analytics where raw identifiers are no longer required.

Until those conditions are met, this repository contains no production retention executor and this draft authorizes no data deletion.
