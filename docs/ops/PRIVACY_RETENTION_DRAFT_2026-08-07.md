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
