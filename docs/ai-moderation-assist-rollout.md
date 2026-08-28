# AI moderation assist-only rollout

Status: production safety invariant for the initial AI moderation rollout.

## Authority model

AI moderation is advisory. Human moderation remains authoritative.

- The model may propose `approved`, `manual_review`, or `rejected`.
- Model-only results persist as `manual_review`.
- Human moderators make final approve/reject/request-changes decisions.
- Deterministic policy-matrix matches remain in manual review.
- Model failure or disabled AI degrades to the human queue.
- No destructive or seller-facing action may be driven solely by model output.

## Safety controls

`AI_MODERATION_ENABLED=false` is the emergency kill switch. It stops model calls while preserving the human queue. `AI_MODERATION_MAX_RUNTIME_SECONDS` bounds model-call runtime.

Assist-only behavior is intentionally hard-coded in `backend/config/ai_moderation.php`. There is no environment variable that can promote the model to authoritative enforcement. Any future non-assist rollout requires a reviewed code change, exact-head CI, measured quality, policy/legal readiness, and a tested rollback plan.

## Seller guidance

Assist-only model output is evidence for moderators, not an instruction to the seller. Seller-facing correction guidance is suppressed when the latest moderation metadata records `rollout.assist_only=true`. Only an explicit human `admin_changes_requested` decision may tell the seller what to change.

## Evidence recorded per decision
Where available, moderation metadata records the model identifier, proposed decision, authoritative decision, rollout state, reviewed media counts, canonical policy IDs, confidence, and structured model result. Raw credentials must never be written to moderation metadata or CI artifacts.

## Failure behavior

- AI disabled: manual review, no model call required.
- Model/network/runtime failure: manual review.
- Unreadable seller media: manual review.
- Video supplied but frames cannot be extracted: manual review.
- Canonical policy signal: manual review regardless of model proposal.

## Measurement status

Synthetic policy fixtures cover ordinary allowed goods, benign tool wording, weapons, controlled medicine, exploitative adult-service wording, and fraud-like offers. These fixtures validate deterministic policy routing; they are not a multimodal model false-positive/false-negative benchmark.

Before any future enforcement proposal, record a dated model/version-specific evaluation with labeled fixture totals, TP/TN/FP/FN, false-positive and false-negative rates, unknown/missing-flag rate, moderator disagreement rate, latency/resource measurements, representative text/photo cases, and a verified kill-switch drill.

## Rollback

Set `AI_MODERATION_ENABLED=false` to stop model calls while preserving human review. Revert code only if configuration rollback is insufficient. Rollback must never reactivate or auto-approve listings already awaiting human review.
