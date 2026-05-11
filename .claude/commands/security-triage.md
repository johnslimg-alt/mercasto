# Security triage

Triage a Mercasto security or production-safety issue.

Review:
- affected route, controller, workflow, or config
- exploit or failure mode
- production impact
- minimal safe fix
- required checks
- rollback path

Output:

## Severity

P0, P1, P2, or P3 with reasoning.

## Evidence

Files, routes, or checks that support the finding.

## Fix plan

Smallest safe implementation plan.

## Smoke

Checks required before merge.

## Rollback

How to revert safely.

Never expose secrets. Never weaken auth, payments, data retention, or production gates to make a check pass.
