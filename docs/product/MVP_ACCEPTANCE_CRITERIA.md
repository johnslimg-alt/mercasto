# Mercasto MVP Acceptance Criteria

Owner: Project Manager Agent + QA Lead Agent + CPO Agent

Purpose: define the exact conditions that must be true before Mercasto can be treated as launch-ready.

## Release decision

Mercasto MVP is launch-ready only if all P0 items pass and P1 items are either fixed or explicitly accepted by the Milestone Supervisor.

## Severity definitions

- P0: blocks launch.
- P1: blocks paid traffic or broad public launch.
- P2: can launch with a tracked follow-up.
- P3: polish.

## P0 acceptance criteria

### Availability

- Homepage returns HTTP 200.
- Main app renders without a blank screen.
- Categories API returns HTTP 200 and valid JSON.
- Ads API returns HTTP 200 and valid JSON.
- Auth providers API returns HTTP 200 and valid JSON.

### Buyer journey

- Buyer can open homepage on mobile.
- Buyer can browse listings.
- Buyer can search or filter without a crash.
- Buyer can open listing details.
- Buyer can see enough seller/contact information to act.
- Buyer can report a problematic listing or the report feature is tracked as a launch blocker.

### Seller journey

- User can register or log in.
- User can open publish flow.
- User can submit a valid listing.
- User can upload at least one valid image.
- User can see listing status after submission.
- User can find own listing in dashboard.
- User can edit own listing.

### Moderation and trust

- New listings follow the intended moderation flow.
- Admin can view pending listings.
- Admin can approve or reject listings.
- Public feed does not show placeholder/demo content.
- Private documents are not visible in public UX.

### Operational readiness

- Production smoke test script exists and runs.
- PR quality gate exists.
- Backup and restore procedure is documented.
- Realtime path is documented and testable.

## P1 acceptance criteria

### UX quality

- Mobile header is usable.
- Search is visible and easy to use.
- Listing cards show image, title, price, location, and category/status context.
- Empty states explain what to do next.
- Loading states are visible on slow requests.
- Validation errors are friendly and in Spanish.

### SEO basics

- robots.txt is present.
- sitemap.xml is present.
- Private/service routes are excluded from intended indexing.
- Main category URLs have a stable URL strategy.
- Homepage title and description are launch-ready.

### Content quality

- Homepage and first category pages look credible.
- Low-quality listings are reviewed before launch.
- Demo content is not mixed with production content.
- Listing quality validation is planned or implemented.

### Observability

- Smoke checks can run from local terminal.
- Scheduled checks are planned or implemented.
- Critical frontend errors are caught by ErrorBoundary.

## P2 acceptance criteria

- Autos landing page has first useful version.
- Services landing page has first useful version.
- Seller trust copy is present.
- Pricing hypotheses for boosts and PRO are documented.
- Analytics event map is documented.

## P3 acceptance criteria

- UI polish issues tracked.
- Copy cleanup tracked.
- Future App.jsx refactor plan tracked.
- AI feature expansion tracked separately from MVP stability.

## Manual QA run

Before any launch push, QA should run:

```bash
npm run smoke:prod
```

Then manually verify:

1. Homepage mobile.
2. Homepage desktop.
3. Search/filter.
4. Listing detail.
5. Login/register.
6. Publish listing.
7. Upload image.
8. Dashboard.
9. Admin moderation if available.
10. Public SEO files.

## Launch go/no-go template

```markdown
# MVP Launch Review

Date:
Commit/deploy:
Reviewer:

## P0 status
PASS / FAIL

## P1 status
PASS / ACCEPTED RISK / FAIL

## Blockers

## Accepted risks

## Required follow-ups

## Decision
GO / NO-GO
```

## Current open launch blockers to track

- Production content quality cleanup.
- Backend listing quality validation.
- Backup restore verification.
- Smoke workflow merge/run.
- Nginx health endpoint merge/deploy.
