# AI description editor gate

This is the launch gate for Mercasto product/ad description editing.

## Decision

Use `qwen2.5-7b-instruct` as the default free model path for high-volume description editing.

If infrastructure capacity allows, evaluate `qwen2.5-14b-instruct` as a higher-quality free option.

Do not use paid API models as the default for high-volume description editing. Paid models may be used only when explicitly configured as a premium or fallback path.

## Product behavior

- The seller can improve or rewrite an ad description from the product/ad card flow.
- The public UI remains Spanish-first.
- The generated text must stay factual and must not invent product details.
- The user must be able to edit the generated text before publishing.
- The feature must work at launch volume without creating mandatory per-request paid AI cost.

## Configuration rules

- Provider and model must be configurable without code changes.
- The default model key should be `qwen2.5-7b-instruct`.
- The runtime should fail closed with a safe UI fallback if the configured free endpoint is unavailable.
- No provider token, endpoint secret, or private model credential may be printed in logs.

## Acceptance checklist

| ID | Check | Pass condition |
| --- | --- | --- |
| AI-TEXT-001 | Default model | Default high-volume description editor model is `qwen2.5-7b-instruct`. |
| AI-TEXT-002 | Paid model guard | Paid models are not selected by default for high-volume description editing. |
| AI-TEXT-003 | Configurable provider | Provider/model can be changed through config or environment. |
| AI-TEXT-004 | Spanish quality | Output is checked with at least one realistic Spanish Mercasto listing. |
| AI-TEXT-005 | User control | Seller can edit generated text before publishing. |
| AI-TEXT-006 | Safe fallback | If AI is unavailable, manual description entry still works. |
| AI-TEXT-007 | No secrets in logs | Logs do not expose AI provider credentials or endpoints. |

## Implementation note

Before wiring runtime code, search the existing repository and deployment configuration for any earlier working free model setting. The user remembers a previous working free option, possibly Qwen 2.5 or Gemma.
