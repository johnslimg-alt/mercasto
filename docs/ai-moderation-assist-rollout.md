# AI moderation assist-only rollout

Status: initial production safety gate for #748.

## Authority model

The AI moderation job is an assistant, not the authoritative moderator during the first rollout.

- The model may propose `approved`, `manual_review`, or `rejected`.
- The persisted authoritative state remains `manual_review` while the promotion gate is not explicitly approved.
- Human moderators make the final approve/reject/request-changes decision.
- Policy-matrix matches always remain in manual review.
- A model failure or disabled AI path degrades to the human moderation queue.
- No account ban, listing deletion, or other destructive action is permitted solely from model output in this rollout.

## Controls

| Setting | Safe default | Purpose |
| --- | --- | --- |
| `AI_MODERATION_ENABLED` | `true` | Emergency model-call kill switch. `false` keeps work in human review. |
| `AI_MODERATION_ASSIST_ONLY` | `true` | Requests assist-only behavior. Changing this alone cannot enable enforcement. |
| `AI_MODERATION_ENFORCEMENT_APPROVED` | `false` | Independent promotion gate. While false, effective `assist_only` remains true even if the other flag is changed. |
| `AI_MODERATION_ROLLOUT_MODE` | `assist` | Records rollout stage in moderation metadata. |
| `AI_MODERATION_MAX_RUNTIME_SECONDS` | `150` | Bounds the model-call runtime budget below the queue job timeout. |

Do not set `AI_MODERATION_ENFORCEMENT_APPROVED=true` merely to reduce queue volume. Promotion to a more authoritative stage requires measured quality evidence, an explicit rollout decision, legal/policy readiness, and a tested rollback path. Both promotion gates must agree before model output can ever become authoritative.

## Evidence recorded per decision

Moderation decision metadata records, where available:

- model identifier;
- model proposal (`proposed_decision`);
- authoritative persisted decision;
- rollout mode and assist-only state;
- reviewed image/video-frame counts;
- policy IDs from deterministic text and model signals;
- confidence and structured model result.

Raw credentials must never be included in moderation metadata or CI artifacts.

## Failure behavior

- AI disabled: archive/pending human review; no model call required.
- model/network/runtime failure: manual review.
- unreadable seller images: manual review.
- video supplied but frames cannot be extracted: manual review.
- canonical policy signal: manual review regardless of model proposal.

## Current measurement status

The repository synthetic policy fixture suite currently covers ordinary allowed goods, benign tool wording, weapons (singular and plural), controlled medicine, exploitative adult-service wording, and fraud-like offers. The deterministic policy-signal layer is expected to classify those fixtures without mismatches and CI guards that behavior.

That deterministic fixture result is **not** a measurement of multimodal model false-positive/false-negative performance. The model-level FP/FN baseline is currently **not measured**, so `AI_MODERATION_ENFORCEMENT_APPROVED` must remain `false`. This explicit `not measured -> no enforcement` state is intentional: absence of evidence cannot be interpreted as permission to automate moderation.

Before any enforcement proposal, record a dated model/version-specific evaluation containing at minimum total labeled fixtures, TP/TN/FP/FN, false-positive rate, false-negative rate, unknown/missing-flag rate, moderator disagreement rate, and representative text/photo cases. If document uploads become an actual listing input, add document fixtures before treating document moderation as covered.

## Rollback

Operational rollback is configuration-first:

1. Set `AI_MODERATION_ENABLED=false` to stop model calls while retaining the human queue.
2. Keep `AI_MODERATION_ASSIST_ONLY=true` and `AI_MODERATION_ENFORCEMENT_APPROVED=false` during investigation.
3. Revert the code change only if configuration rollback is insufficient.

A rollback must not reactivate or auto-approve listings that are already awaiting human review.

## Promotion gate

Before any future non-assist rollout, record at minimum:

- representative allowed/prohibited/restricted fixture results;
- false-positive and false-negative measurements for the exact model/version;
- moderator override/disagreement rate;
- latency/resource measurements;
- policy-matrix coverage and unknown/missing-flag rate;
- confirmed kill-switch drill;
- explicit approval of the new rollout stage.

Public legal policy remains separately subject to qualified Mexico legal review; this document is an engineering safety contract, not legal advice.
