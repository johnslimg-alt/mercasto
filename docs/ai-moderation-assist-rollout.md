# AI moderation assist-only rollout

Status: initial production safety gate for #748.

## Authority model

The AI moderation job is an assistant, not the authoritative moderator while `AI_MODERATION_ASSIST_ONLY=true`.

- The model may propose `approved`, `manual_review`, or `rejected`.
- The persisted authoritative state remains `manual_review` in assist-only mode.
- Human moderators make the final approve/reject/request-changes decision.
- Policy-matrix matches always remain in manual review even if assist-only is later disabled.
- A model failure or disabled AI path degrades to the human moderation queue.
- No account ban, listing deletion, or other destructive action is permitted solely from model output in this rollout.

## Controls

| Setting | Safe default | Purpose |
| --- | --- | --- |
| `AI_MODERATION_ENABLED` | `true` | Emergency model-call kill switch. `false` keeps work in human review. |
| `AI_MODERATION_ASSIST_ONLY` | `true` | Prevents AI proposals from becoming authoritative listing decisions. |
| `AI_MODERATION_ROLLOUT_MODE` | `assist` | Records rollout stage in moderation metadata. |
| `AI_MODERATION_MAX_RUNTIME_SECONDS` | `150` | Bounds the model-call runtime budget below the queue job timeout. |

Do not change `AI_MODERATION_ASSIST_ONLY` to false merely to reduce queue volume. Promotion to a more authoritative stage requires measured quality evidence, an explicit rollout decision, and a tested rollback path.

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

## Rollback

Operational rollback is configuration-first:

1. Set `AI_MODERATION_ENABLED=false` to stop model calls while retaining the human queue.
2. Keep `AI_MODERATION_ASSIST_ONLY=true` during investigation.
3. Revert the code change only if configuration rollback is insufficient.

A rollback must not reactivate or auto-approve listings that are already awaiting human review.

## Promotion gate

Before any future non-assist rollout, record at minimum:

- representative allowed/prohibited/restricted fixture results;
- false-positive and false-negative measurements;
- moderator override/disagreement rate;
- latency/resource measurements;
- policy-matrix coverage and unknown-flag rate;
- confirmed kill-switch drill;
- explicit approval of the new rollout stage.

Public legal policy remains separately subject to qualified Mexico legal review; this document is an engineering safety contract, not legal advice.
