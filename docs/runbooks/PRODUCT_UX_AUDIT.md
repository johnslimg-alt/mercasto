# Mercasto Product and UX Audit Runbook

Owner: CPO Agent + UI/UX Specialist + Design Reviewer

Purpose: verify the core marketplace experience before launch traffic.

## Product principle

Mercasto must feel simple, safe, local, and mobile-first for Mexico. The user should understand within 5 seconds:

- what Mercasto is;
- how to search;
- how to publish;
- how to contact a seller;
- why it is safer than random social posts.

## Core user journeys

### Journey 1: Buyer browses listings

1. Open homepage.
2. Understand value proposition.
3. Search or choose category.
4. Filter by category/location/price.
5. Open listing detail.
6. Review images and seller info.
7. Contact seller.

Pass criteria:

- no blank screen;
- search visible above fold on mobile;
- categories understandable in Spanish;
- listing cards show price, title, location, image, seller trust indicator if available;
- detail page has clear contact CTA.

### Journey 2: Seller publishes listing

1. Open publish flow.
2. Register/login if needed.
3. Enter title, category, price, location, description.
4. Upload photos.
5. Submit.
6. Understand moderation/pending/active state.
7. Find listing in dashboard.

Pass criteria:

- form labels are clear;
- validation messages are friendly;
- mobile image upload works;
- category selection is not overwhelming;
- post-submit state is obvious.

### Journey 3: User manages account

1. Login.
2. Open dashboard.
3. See own listings.
4. Edit/pause/delete listing.
5. See favorites or profile.

Pass criteria:

- dashboard does not feel admin-only;
- status labels are human-readable;
- empty states explain what to do next;
- destructive actions require confirmation.

## Two-step critique

### Critique 1: risk and correctness

Check:

- Can the user complete the task?
- Is any important action hidden on mobile?
- Can a user lose data?
- Does the flow create trust or confusion?
- Does a broken API response crash the UI?

### Critique 2: alternatives and quality

Check:

- Could the flow be shorter?
- Does the UI look credible enough for paid sellers?
- Are spacing, hierarchy, typography, and contrast consistent?
- Is Spanish copy natural for Mexico?
- Are WhatsApp-first behaviors supported?

## UI quality checklist

### Layout

- [ ] Header usable on mobile.
- [ ] Search is prominent.
- [ ] Category chips/cards are tappable.
- [ ] Listing grid does not overflow.
- [ ] Primary CTA is visually dominant.
- [ ] Buttons have enough touch target size.

### Listing cards

- [ ] Image ratio consistent.
- [ ] Price visible.
- [ ] Location visible.
- [ ] Category/status not confusing.
- [ ] Seller trust marker visible if available.
- [ ] Favorite/share/contact actions do not clutter.

### Forms

- [ ] Required fields marked.
- [ ] Validation messages helpful.
- [ ] Upload progress/loading visible.
- [ ] Submit button disabled while submitting.
- [ ] Error recovery path exists.

### States

- [ ] Empty results state.
- [ ] Loading skeleton or spinner.
- [ ] API error state.
- [ ] Offline/slow connection behavior if possible.
- [ ] No white screen on lazy import failure.

### Copy

- [ ] Spanish first.
- [ ] No Russian text visible to end users unless language selected.
- [ ] CTA verbs are clear: Comprar, Vender, Publicar, Contactar.
- [ ] Trust language is explicit: verificado, seguro, reportar.

## Prioritized UX fixes template

```markdown
# UX Finding

## Severity
P0 / P1 / P2 / P3

## Journey affected

## Screenshot / route

## Problem

## Why it matters

## Recommended fix

## Acceptance criteria

## Owner agent
```

## Launch blockers

Block launch if:

- homepage does not render;
- publish flow cannot submit;
- image upload is broken;
- listing detail cannot be opened;
- buyer cannot contact seller;
- mobile layout is unusable;
- auth blocks normal browsing;
- obvious trust/safety copy is missing.

## Output format

```markdown
# Product UX Audit Result

Date:
Reviewer:
Viewport tested:
Routes tested:

## Summary
PASS / FAIL

## P0 blockers

## P1 major issues

## P2/P3 polish

## Top 5 fixes

## Follow-up issues created
```
