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

`-> 0,0x0` means those sections were **removed from the DOM after first paint**. The shift
is therefore caused by sections mounting/unmounting as the listing data settles, not by a
static layout mistake.

### Causal proof — the shift is data-driven

Same route, same build, ads endpoints stubbed with a fixed payload of 12 listings:

| Data source | 1440 px | 390 px |
| --- | --- | --- |
| live API | **CLS 0.4444** | 0.0001 |
| fixed mocked payload | **CLS 0.0021** | 0.0001 |

With stable data the desktop CLS collapses to ~0.002, well inside target. So the fix is to
make the section layout independent of the transient data state, for example:

- render a stable placeholder that reserves the rail's height until the data settles,
  instead of returning `null` from `AdRail` when `items` is briefly empty;
- derive section visibility from a settled signal (e.g. "request finished") rather than
  from the array length on each render;
- keep the trending grid's row height fixed while `showAllTrending`/item counts change.

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
