# Home V2 performance audit — 2026-09-11

Method: production build (`vite build`) served locally (`vite preview`), real public API
(`https://mercasto.com/api`), Chromium via Playwright. Mobile runs use 4× CPU throttling
to represent a mid-range phone; desktop runs unthrottled. LCP and CLS come from
`PerformanceObserver` (`largest-contentful-paint`, `layout-shift`) installed before load;
long tasks are the `longtask` entries as a TBT proxy. These are **local build numbers,
not production field data** — re-measure on production after cutover.

## 1. Home V2 vs legacy home

| Metric | V2 mobile | legacy mobile | V2 desktop | legacy desktop |
| --- | --- | --- | --- | --- |
| LCP | **1584 ms** | 4872 ms | **676 ms** | 1596 ms |
| CLS | 0.0001 (intermittent, see §2) | 0.2940 | **0.4444** | 0.2245 |
| Long tasks | 9 (1483 ms) | 17 (4913 ms) | 3 (297 ms) | 6 (543 ms) |
| Transfer | **768 KB** | 1179 KB | **768 KB** | 1266 KB |
| JS chunks requested | **22** | 24 | **22** | 30 |
| CSS files | 2 | 1 | 2 | 4 |

V2 is a clear win on mobile: LCP is roughly 3× faster, long-task time is ~3× lower, and it
transfers ~400 KB less. Two exceptions below need attention.

## 2. CLS on desktop is a real defect (ТЗ target is CLS < 0.1)

Reproduced with no programmatic scrolling, so scroll-induced entries cannot pollute it:

```
/design-v2 @1440px  CLS 0.4502  (3 events)
  +0.4472 @526ms
      SECTION.v2-promo-rail.v2-scroll   546,1288x193  ->  0,0x0
      SECTION.v2-section                739,1328x161  ->  0,0x0
      SECTION.v2-section.v2-trending-section  455,1288x91  ->  897,1288x3

/design-v2 @390px   CLS 0.7935  (2 events)
  +0.7933 @446ms
      DIV.v2-content      419,390x481  ->  446,390x454
      FORM.v2-search-form 186,390x154  ->  213,390x154
      SECTION.v2-promo-rail.v2-scroll  569,390x171  ->  0,0x0
```

`-> 0,0x0` means those nodes were replaced between two renders. The visible section
positions confirm the mechanism: in the pre-data render the promo rail sits at **y=546**
and the next section at **y=739**; once the listings arrive the promo rail is pushed to
**y=2342**. Everything below the ad rails therefore jumps by up to ~1800 px.

### Mechanism (sampled every 100 ms, no scrolling)

```
t= 368ms  doc=1351px  cards= 0   sections not yet in the DOM
t= 526ms  <- the +0.4472 layout-shift event fires here
t= 595ms  doc=5668px  cards=16   full content present, promo rail now at y=2342
t= 861ms  doc=5478px             secondary -190 px change
```

So HomeScreenV2 first paints with **empty listing data** (a compact layout in which the
featured and trending rails contribute almost no height), and the page then grows by
~4300 px when the ads resolve after first paint. That single transition produces the whole
desktop CLS.

### Causal proof — the shift is data-driven

Same route, same build, ads endpoints stubbed with a fixed payload of 12 listings. With an
instant stub the data is already present at first paint, so the transition never happens:

| Data source | 1440 px | 390 px |
| --- | --- | --- |
| live API | **CLS 0.4444** | 0.0001 |
| fixed mocked payload | **CLS 0.0021** | 0.0001 |

### Fix direction

Reserve the rail geometry so the page height does not depend on whether the listings have
arrived yet:

- render each ad rail as a fixed-height skeleton (same card height / row height as the
  loaded rail) instead of letting `AdRail` contribute ~0 height before data lands;
- keep the number of skeleton cards equal to the number the section will render;
- avoid changing the number of rendered cards between the pre-data and post-data renders
  (that is what moves the promo rail by ~1800 px);
- do **not** fix this by delaying first paint of the whole screen until the fetch resolves —
  that would trade CLS for a worse LCP.

A stable-payload CLS near 0.002 is the expected shape after the fix.

### Mobile CLS is intermittent

Two runs on the same build measured mobile CLS at **0.0001** and **0.7935**. That is a race
between data arrival and paint, so mobile is not reliably clean either — treat §2 as one
defect, not a desktop-only one.

## 3. Chunk discipline — V2 passes, legacy home fails

The ТЗ requires that a home route never pulls Map / Charts / Admin bundles.

| Route | Forbidden chunks loaded |
| --- | --- |
| `/design-v2` | **none** |
| `/` (legacy) | **Map (MapV3), Leaflet** on desktop |

Legacy pulls Leaflet on the home route through the real-estate map card; V2 does not. The
heavy chunks exist in the build and stay lazy on the home route — `DashboardCharts` 368 KB,
`GeoSourcePage` 176 KB, `leaflet-src` 148 KB, `UserDashboard` 124 KB, `AdminScreen` 96 KB.

The largest eagerly loaded chunk is `index-*.js` at **512 KB** (plus `vendor-react` 176 KB,
`vendor-misc` 100 KB). Worth a separate look, but it is not a V2 regression.

## 4. Static security gates — all green

| Gate | Result |
| --- | --- |
| `npm run check:static-safety` | exit 0 |
| `npm run check:security-audit` | exit 0 |
| `npm run check:scripts` | exit 0 |
| `npm run check:npm-audit-policy` | exit 0 |

The network probe gates (`smoke:security`, `smoke:session-security`, `smoke:route-audit`)
default to `https://mercasto.com` and are deliberately **not** run from here; they belong to
the cutover window — see `docs/home-v2-cutover-plan.md` §5.

## 5. Actions

1. **Fix the data-driven CLS before cutover** — it is the only measured metric outside the
   ТЗ targets (CLS < 0.1). Owned by `HomeScreenV2.jsx`.
2. Re-measure both routes after the fix; a stable-payload CLS near 0.002 is the expected
   shape.
3. Consider trimming the 512 KB entry chunk separately.
4. Re-run this audit on production after cutover and compare against these baselines.
