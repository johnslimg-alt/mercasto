# Mercasto QA Smoke Test Matrix

Owner: QA Lead Agent

Run this checklist after every deploy and before paid traffic.

## Severity levels

- P0: blocks launch or core revenue path.
- P1: major user journey broken.
- P2: visible UX or quality issue.
- P3: polish or non-blocking improvement.

## Public availability

| Check | Expected | Severity |
|---|---|---|
| Homepage loads | HTTP 200, no blank screen | P0 |
| Main bundle loads | No console errors that block app render | P0 |
| Mobile homepage | Header, search, categories, and cards usable at 390px width | P1 |
| Desktop homepage | Layout is not broken at 1440px width | P1 |
| Dark mode if enabled | Text remains readable and contrast is acceptable | P2 |

## API availability

| Endpoint | Expected | Severity |
|---|---|---|
| `/api/categories` | HTTP 200, valid JSON array/object | P0 |
| `/api/ads?page=1` | HTTP 200, valid JSON pagination response | P0 |
| `/api/auth/providers` | HTTP 200, valid JSON | P1 |
| `/up` | HTTP 200 `ok` | P1 |
| `/health` | HTTP 200 `ok` if configured | P1 |

## Search and browse

| Check | Expected | Severity |
|---|---|---|
| Empty search | Shows active listings or empty state, not crash | P0 |
| Text search | Results update or empty state appears | P1 |
| Category filter | Filters without losing layout | P1 |
| Location filter | Does not crash if no location results | P1 |
| Price filters | Invalid numbers are handled | P2 |
| Pagination/load more | Does not duplicate or skip obvious results | P2 |

## Listing detail

| Check | Expected | Severity |
|---|---|---|
| Open listing | Listing detail renders | P0 |
| Seller info | Seller name/verification state visible if available | P1 |
| Image gallery | Images load or fallback shown | P1 |
| Contact action | WhatsApp/contact button is visible and safe | P1 |
| Report action | Abuse/report flow exists or is clearly planned | P2 |

## Authentication

| Check | Expected | Severity |
|---|---|---|
| Register modal/page opens | No crash | P0 |
| Login modal/page opens | No crash | P0 |
| Wrong credentials | Friendly error | P1 |
| Logout | Clears session and returns to public state | P1 |
| Protected dashboard without login | Redirects or shows auth prompt | P1 |

## Publish listing flow

| Check | Expected | Severity |
|---|---|---|
| Publish route opens | Form renders | P0 |
| Required validation | Missing title/price/category/description handled | P0 |
| Category dropdown | Categories loaded | P1 |
| Location field | Accepts Mexico city/state text | P2 |
| Image upload | Accepts allowed image types within size limits | P0 |
| Large image | Friendly error if over limit | P1 |
| Submit valid listing | Returns success or pending moderation state | P0 |
| Post-submit dashboard | User can find own listing | P1 |

## Dashboard

| Check | Expected | Severity |
|---|---|---|
| My listings | Loads without crash | P0 |
| Edit listing | Opens existing data | P1 |
| Pause/archive listing | Status changes or clear error | P1 |
| Favorites | Loads or empty state | P2 |
| Profile settings | Loads and handles validation | P2 |

## Realtime / Reverb

| Check | Expected | Severity |
|---|---|---|
| WebSocket path | `/app/{key}` upgrades through web server path | P1 |
| Browser connection | No repeated failed connection loop | P1 |
| Internal port exposure | Realtime service is not publicly exposed directly | P0 |

## Uploads and media

| Check | Expected | Severity |
|---|---|---|
| Storage public path | Uploaded media reachable only via intended URL | P1 |
| Unsupported file | Rejected with friendly error | P1 |
| Video upload if enabled | Handles size/type validation | P2 |
| Watermark/processing if enabled | Does not block listing creation indefinitely | P2 |

## Admin/moderation

| Check | Expected | Severity |
|---|---|---|
| Non-admin access | Admin APIs are forbidden | P0 |
| Pending ads | Admin can review if logged in | P1 |
| Reports | Admin can view reports if logged in | P1 |
| KYC docs | Private documents not public | P0 |

## Smoke test commands

Use these from a safe terminal after deploy:

```bash
curl -I https://mercasto.com/
curl -sS https://mercasto.com/up
curl -sS https://mercasto.com/health
curl -sS https://mercasto.com/api/categories | head -c 500
curl -sS 'https://mercasto.com/api/ads?page=1' | head -c 500
curl -sS https://mercasto.com/api/auth/providers | head -c 500
```

## Release decision

- Any P0 failure blocks release.
- Two or more P1 failures block paid traffic.
- P2/P3 failures become follow-up issues.

## Output format

```markdown
# Smoke Test Result

Date:
Commit/Deploy:
Tester:

## Summary
PASS / FAIL

## P0 findings

## P1 findings

## P2/P3 findings

## Screenshots / logs

## Decision
Release / rollback / fix forward
```
