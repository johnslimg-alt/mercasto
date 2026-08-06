# Mobile UX polish backlog — 2026-08-06

Owner: Product + Frontend

Source issue: #136

Status: planning only; no implementation is included here.

## Evidence baseline

This backlog is grounded in the production and isolated screenshots under:

- `docs/evidence/ui-visual-qa/2026-08-06-4eec7284/`
- `docs/evidence/ui-visual-qa/2026-08-06-authenticated-4ca3e0e9/`
- `docs/evidence/ui-visual-qa/2026-08-06-mobile-backlog/`

The automated evidence found no document-level horizontal overflow, broken images, page errors or console errors. The work below targets clarity, speed, hierarchy and recovery rather than a broken responsive baseline.

## Priority model

- P1: blocks or obscures a primary conversion.
- P2: creates confusion, excessive scrolling or weak trust.
- Every implementation slice must remain small enough for one focused PR and must preserve desktop behavior.

## PR slice A — navigation and homepage discovery

### 1. Make the horizontal taxonomy navigation discoverable — P2

Evidence: the last category is visibly clipped on all reviewed mobile screens, with no indication that the row is scrollable.

Change: add edge fades, scroll snapping and automatic centering of the active category. Preserve touch scrolling and keyboard access.

Acceptance:

- both edges show a continuation cue only when more items exist;
- the active category is visible after direct navigation and refresh;
- no document-level overflow at 360, 390 and 412 px;
- desktop navigation remains unchanged.

### 2. Improve the featured-card rail on the homepage — P2

Evidence: two dense cards occupy the viewport, titles are clipped and the next content is not clearly announced as a horizontal rail.

Change: use one full card plus a partial next-card preview, snap points and a compact position cue. Keep two title lines and the seller/location trust row readable.

Acceptance:

- the first card has a usable width of at least 82% of the viewport;
- the next card is visibly discoverable without cutting essential text;
- swipe, tap and keyboard behavior remain functional;
- LCP image loading and existing card analytics do not regress.

## PR slice B — search and filter controls

### 3. Consolidate the mobile results toolbar — P2

Evidence: heading/count, Filters, map, result summary and grid/list controls are spread across three separate blocks before the first card.

Change: create one compact sticky results toolbar with count, Filters and view mode; keep map as a secondary action.

Acceptance:

- the first result begins materially higher on a 915 px viewport;
- Filters remains reachable while scrolling results;
- count and view mode update without layout jumps;
- toolbar controls retain 44 px touch targets.

### 4. Collapse the map into a true compact row — P2

Evidence: the closed map state reserves a large empty panel while showing only `Mostrar mapa`.

Change: render a single compact map row until expanded; create the map canvas only after user intent or when a location result requires it.

Acceptance:

- collapsed height is no more than 56 px;
- expanding and collapsing preserves filters and scroll position;
- map code is not initialized in the collapsed state;
- accessibility state exposes `aria-expanded` and the controlled region.

## PR slice C — recovery and inventory trust

### 5. Give the empty-results state direct recovery actions — P1

Evidence: an empty query displays only advice to change filters or search, while the user must manually discover how to recover.

Change: add `Borrar búsqueda`, `Restablecer filtros`, category suggestions and `Publicar lo que buscas/vendes` as context-appropriate actions.

Acceptance:

- one tap restores an unfiltered result set;
- the original query stays editable;
- actions are visible above the bottom navigation;
- empty-state analytics distinguish reset, category and publish actions.

### 6. Clarify real listings versus catalog references — P1

Evidence: the results header reports `0 reales · 16 catálogo`, while catalog cards visually resemble normal offers and use a seller-acquisition CTA.

Change: visually separate catalog mode from active marketplace supply, explain it once near the count and keep `Vende uno similar` distinct from contact/buy actions.

Acceptance:

- catalog cards cannot be mistaken for an available seller offer;
- active listings remain the default/highest-priority result group when present;
- the explanation is concise and available to screen readers;
- catalog filler never enters genuine-supply analytics or indexable listing claims.

## PR slice D — listing detail

### 7. Strengthen the mobile listing-detail action hierarchy — P1

Evidence: a large image pushes title, status, price and the primary action down; catalog and real-listing actions need different hierarchy.

Change: reduce initial media height, keep status/title/price closer together and provide a sticky bottom action only for the correct listing type: contact for active listings, publish-similar for catalog references.

Acceptance:

- title, status and price are visible within the first viewport at 412 × 915;
- active listings expose one unambiguous contact action;
- catalog references expose no contact/purchase implication;
- sticky actions respect safe areas and do not cover content.

## PR slice E — publish flow

### 8. Remove the duplicate `Coches`/`Motor` choice in publication — P1

Evidence: step one shows both `Coches` and `Motor` as separate top-level choices even though the search taxonomy treats motor as the stable vertical.

Change: expose one canonical vehicle entry and route subtypes beneath it. Use the same labels/slugs in search, publish, edit and analytics.

Acceptance:

- no duplicate vehicle choice appears;
- existing stored `coches` and `motor` values remain editable through compatibility mapping;
- new submissions use the canonical taxonomy;
- category analytics do not split the same intent across two names.

### 9. Separate the publish CTA from the bottom navigation — P1

Evidence: the disabled `Siguiente` bar sits directly above the persistent plus navigation and covers the last category row.

Change: use one safe-area-aware action layer, reserve content padding and show why the button is disabled until a category is selected.

Acceptance:

- no category tile is obscured at 360–430 px widths;
- selecting a category gives immediate visual and screen-reader feedback;
- the CTA state and validation reason are explicit;
- browser back/forward and draft recovery preserve the selected category.

## PR slice F — stable loading states

### 10. Match loading skeletons to final mobile geometry — P2

Evidence: automated captures validate final screens, but launch QA still needs stable intermediate states for home rails, search cards, listing detail and publish attributes.

Change: use route-specific skeletons with final card/media/control dimensions, disable actions until required data exists and announce loading completion politely.

Acceptance:

- no blank full-screen state on the four target flows;
- skeleton-to-content layout shift stays below the agreed CLS budget;
- failed requests transition to a retryable error/empty state;
- reduced-motion users receive no shimmer animation;
- Playwright covers loading, success, empty and error outcomes.

## Recommended order

1. PR E: items 8–9, because publication is the primary seller conversion.
2. PR C: items 5–6, because empty/catalog states directly affect trust and recovery.
3. PR B: items 3–4, to reduce time to first result.
4. PR D: item 7, to improve contact/publish-similar conversion.
5. PR A: items 1–2, for global discovery and homepage readability.
6. PR F: item 10, as the shared loading/error-state polish pass.

No item authorizes a broad redesign, fabricated inventory, paid-traffic scale-up or a change to current SEO indexability rules.
