# AI moderation quality evaluation

This evaluation lane measures the private/local moderation assistant before any enforcement promotion is considered.

## Safety boundary

- The report is **measurement only**. It never changes a listing, account, moderation status, or policy decision.
- Inputs to the quality report must be synthetic benchmark observations only. Do not put listing text, user images, identity documents, credentials, phone numbers, email addresses, IP addresses, or other personal data in JSONL fixtures or CI artifacts.
- `manual_review` and `rejected` are both counted as a positive risk signal for measurement. Human moderation remains authoritative.
- The generated report carries `rollout_mode=shadow_assist` and `authoritative=false` so it cannot be mistaken for an enforcement artifact.

## Observation format

One privacy-safe observation per JSONL line:

```json
{"fixture":"synthetic-weapon","category":"weapons","expected":"risk","decision":"manual_review","confidence":0.93}
```

Required fields:

- `fixture`: synthetic fixture identifier only;
- `category`: canonical evaluation category;
- `expected`: `allowed` or `risk`;
- `decision`: gateway output `approved`, `manual_review`, or `rejected`;
- `confidence`: numeric model confidence in `[0,1]`.

The evaluation set for #748 must include at least allowed, weapons, explicit/adult, controlled-product, and fraud-like fixtures before enforcement is considered.

## Generate a report

From the AI gateway environment:

```bash
python -m mercasto_ai.quality /path/to/synthetic-observations.jsonl --output /tmp/moderation-quality.json
```

The report records aggregate and per-category TP/FP/TN/FN, precision, recall, false-positive rate, false-negative rate, and accuracy. A non-zero false-negative count must remain visible in the report; do not turn this measurement into an all-green pass/fail gate by hiding misses.

Model/version/runtime metadata should be recorded alongside the benchmark run that produced the observations. Raw private media must never be embedded in this report.
