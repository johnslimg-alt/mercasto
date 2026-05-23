# Third-party AI evidence audit

This audit records which launch-readiness claims must be re-verified before Mercasto can be marked public-launch ready.

## Rule

Generated reports are not launch evidence unless backed by one of these:

- GitHub Actions workflow run logs;
- GitHub Actions artifacts;
- server terminal output with command, timestamp and commit;
- provider dashboard/API evidence with secrets redacted;
- issue comments containing copied command output.

## Audit target

Recent third-party AI commits added optimistic launch reports and local files claiming readiness. These reports must be treated as unverified until evidence is attached to issues #272 and #273.

## Claims requiring verification

| Claim | Current acceptance status | Required proof |
| --- | --- | --- |
| READY FOR PRODUCTION | Not accepted | #272 final go/no-go note with all P0 blockers resolved |
| 50/50 Playwright tests passed | Not accepted | Public E2E Smoke workflow logs/artifact |
| SMS OTP ready | Not accepted | SMS Readiness Evidence workflow output and #260 closure |
| Payments/webhooks ready | Not accepted | Signed, invalid and duplicate webhook evidence in #265 |
| Backup restore drill succeeded | Not accepted | Restore drill output from staging/disposable DB in #267 |
| Lighthouse score claimed | Not accepted | report artifact or recorded run in #271 |
| Security pass claimed | Not accepted | security command output and #268 evidence |
| Legal/business ready | Not accepted | public policy URLs and #269 evidence |

## Suspicious evidence markers

The following should not be accepted as final evidence by itself:

- `file:///Users/ivan/...` links;
- screenshots without command/log context;
- reports that say `Done` while the corresponding launch-blocker issue is open;
- claims of provider readiness without provider-safe evidence;
- claims of restore drills without database target, backup artifact and command output;
- claims of E2E pass without workflow run ID or Playwright artifact.

## Required verification order

1. Sync production to latest `main` using the established deploy gate.
2. Confirm `UP=200` and `VERIFY_EXIT=0`.
3. Run Launch Artifact Inventory.
4. Run Launch Status Summary.
5. Run Env Readiness Evidence.
6. Run Category Data Readiness.
7. Run SMS Readiness Evidence.
8. Run Backup Freshness Evidence.
9. Run Public E2E Smoke.
10. Attach workflow logs/artifacts to #272 and #273.

## Status

Public launch remains NO-GO until #273 is closed with real evidence.
