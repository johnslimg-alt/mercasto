# Home V2 — analytics audit (ТЗ §13)

Requirement: the listed funnel events must fire, and the V2 home must be comparable to the
legacy home after launch (search usage, card CTR, publish, signup, pricing, contact, bounce,
scroll depth).

Method: stubbed `gtag`, `fbq` and `dataLayer` before load, then performed the real
interactions in a browser against the production build and captured what the app actually
emitted. Static call-site analysis was used to confirm and explain the gaps.

## Result against the §13 list (V2 home)

| Required event | Status | Evidence |
| --- | --- | --- |
| V2 impression | works | `page_view`, `virtual_page_view` on load |
| search | works | `search` (+ `form_submit`, `page_dwell`), payload `page_path: /?search=Nissan` |
| category click | works | `category_selected` with `source` |
| card click | works | `listing_viewed` on opening a detail |
| pricing viewed | works | `view_item` with `item_category: 'promotion'` (`events.promotionViewed`) |
| publish CTA | works (static) | `events.publishStep('home_cta', null, { source: 'design_v2_publish' })` |
| card impression | **suppressed** | see §2 |
| filter opened / filter applied | **missing** | see §1 |
| favorite | **missing** | see §1 |

> Correction to a first-pass reading: `promotionViewed` maps to `view_item`, so "pricing
> viewed" does fire — an earlier regex looked for a literal `promotion` event name and wrongly
> reported it missing.

## 1. Two genuine gaps

### No filter event exists anywhere in the codebase

```
grep -rnE "filter_(open|appl)|filterOpened|filterApplied|filters_(open|appl)" src/  ->  no matches
```

Opening the V2 filter panel emits only the generic `ui_click` from the shared click tracker.
So §13's "filter opened" and "filter applied" are **not implemented** — not just for V2, for
any surface. This is a gap against the ТЗ, not a V2 regression.

### Toggling a favourite emits nothing

`favoriteAdded` is defined in `analytics.js:859` and mapped into the Meta/TikTok bridges, but
it has **zero call sites** in the whole of `src/`:

```
favoriteAdded  0 call site(s)   publishStep 4   registered 3   leadCreated 1   messageSent 1
```

`handleToggleFavorite` (`App.jsx:2674`) only applies the change and updates state. So a
favourite — one of the strongest buyer-intent signals — is invisible to analytics.

Note for testers: a **guest** clicking the heart opens the auth modal and returns early
(`if (!user) { setShowAuthModal(true); return; }`), so a guest click can never emit. The event
is missing for signed-in users too, which is the real problem.

## 2. Card impressions are wired but deliberately suppressed for catalog listings

Scrolling the entire V2 home gradually (350 px steps, 450 ms apart to let each card cross the
IntersectionObserver's 0.45 visibility threshold) and then waiting 4 s for the batched flush
produced **zero `ad_impression` events**.

Cause, in `AdCard.jsx`:

```jsx
<article ref={isCatalogFiller ? null : observeRef} ...>
```

The impression observer is skipped for `is_catalog_filler` rows. Every listing currently in
the catalogue is a catalog reference — the same 32/32 filler rows measured earlier — so on
today's data the home emits no impressions at all.

This behaviour is **pre-existing** (the original AdCard had the same guard), not something V2
introduced. But it means §13's "card impression" yields nothing in production as data stands,
and V2's card CTR will be unmeasurable against the legacy home. If reference listings are not
meant to count, that is a product decision to record explicitly; if they are, the guard needs
revisiting.

## 3. What this means for the post-launch comparison

§13 asks marketing to compare legacy vs V2 on search usage, card CTR, publish conversion,
signup, pricing views, contact-seller, bounce and scroll depth. With the state above:

- measurable now: search, category clicks, card clicks, pricing views, publish CTA, signup,
  contact, bounce, scroll depth (`scroll_depth` fires, observed on scroll);
- **not measurable**: card CTR (no impressions) and favourite intent (no event);
- filter usage cannot be reported because no filter event exists.

Fixing the two gaps and deciding the filler-impression question are prerequisites for a
meaningful legacy-vs-V2 comparison, and they are cheap compared with the launch they inform.
