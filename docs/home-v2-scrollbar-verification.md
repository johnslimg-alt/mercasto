# Home V2 — scrollbar contract verification (ТЗ §3)

Requirement: **scrolling works, no visible bar** on every user-facing scrolling surface.

Method: production build served locally, Chromium via Playwright. For every element in
`body *` the audit checks whether it actually has overflow (`scrollWidth > clientWidth` or
`scrollHeight > clientHeight`), whether the author allowed scrolling (`overflow-x/y` is
`auto`/`scroll`), and whether the bar is hidden — via `::-webkit-scrollbar { display:none }`
or `scrollbar-width: none`. Light and dark, desktop (1440) and mobile (390).

## Result: PASS

**10 scroll surfaces found, 10 with the bar hidden, 0 rendering a visible bar.**

| Route | Viewport | Surfaces | Bar hidden |
| --- | --- | --- | --- |
| `/design-v2` | desktop 1440 | 0 (rails do not overflow at this width) | — |
| `/design-v2` | mobile 390 | 4 — `v2-category-rail`, `v2-featured-rail`, `v2-promo-rail`, `v2-quick-row` | 4 / 4 |
| `/listings` | desktop 1440 | 1 — `catalog-desktop-sidebar` | 1 / 1 |
| `/listings` | mobile 390 | 0 | — |

Covered by the audit: horizontal rails (categories, featured, ads, promo, quick filters) and
the sticky catalog filter rail. Language dropdown, mobile filter sheet, autocomplete and map
surfaces are covered by their own e2e specs (already green on this branch) rather than by
this probe.

## Scrollability is genuinely intact

A bar can be hidden without breaking scrolling; this was verified separately, because that
is the failure mode the requirement exists to prevent.

Measured on the same build at a 420 px viewport (no mobile emulation, so wheel input behaves
like a real browser):

```
.v2-featured-rail  sw=1181 cw=420  wheel scrollLeft 0 -> 14   SCROLLS
.v2-promo-rail     sw=978  cw=420  wheel scrollLeft 0 -> 14   SCROLLS
.v2-category-rail  sw=864  cw=420  wheel scrollLeft 0 -> 296  SCROLLS
```

Keyboard also reaches them: with focus, `ArrowRight` moved `.v2-featured-rail` to 305,
`.v2-promo-rail` to 334 and `.v2-category-rail` to 108.

## Methodology warning — two false positives to avoid repeating

The first two probe designs reported these rails as "scrollable but cannot move". Both were
artifacts, not defects:

1. **Assigning `scrollLeft` programmatically** is unreliable on these rails: they use
   `scroll-snap-type: x mandatory`, so the container snaps straight back and the read looks
   like a failure. Use a real input gesture.
2. **Mouse drag under mobile emulation** (`isMobile: true`) does not pan a scroll container —
   only touch does. A mouse `down`/`move`/`up` sequence produced no movement even though the
   rail scrolls fine for a real user.

A single wheel tick on a `mandatory` snap rail advances to the nearest snap point (14 px
here), which is expected carousel behaviour, not a stuck rail — verify with a second tick
before calling it broken.
