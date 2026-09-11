# Home V2 — real-data audit (ТЗ §7)

Requirement: no mock, Base44 or static fake listings, no placeholder prices, no fake
counters. V2 must consume real production entities only.

Method: static scan of the V2 surface, plus a live browser check against production for the
fabricated content that the legacy home can fall back to.

## 1. V2 surface is clean

| Signal | Hits in `HomeScreenV2.jsx` |
| --- | --- |
| `picsum` | 0 |
| `Math.random` | 0 |
| `lorem` / `dummy` / `mock` / `hardcod` | 0 |
| literal listing arrays | 0 |
| `mockData` import | **0** |

Every listing section is fed from real props — `serverAds`, `realEstateAds`, `jobAds`,
`serviceAds`, `automotiveAds`, `featured`, `adsTotal`. The remaining `placehold` matches are
legitimate: input placeholders and the `/placeholder-ad.svg` fallback for ads with no image,
which §6 explicitly asks for.

The counter is also honest now — the code carries the comment *"No fake counters:
`safeAds.length` is the size of the loaded page, not the real total"* and uses `adsTotal`.

## 2. V2 removes a real source of fabricated content

The **legacy** home lazily imports `src/constants/mockData.js` 3.5 s after mount and keeps
`spotlightRealEstate`, `jobsBoard`, `servicesMarketplace`, `automotiveDeals` and
`recentlyViewed` as fallbacks. Those exports are invented listings, not reference data:

```js
spotlightRealEstate = [
  { price: '$1,850,000', specs: 'Casa 3 rec • 180m² • Jardín', location: 'Tlaquepaque • 2d ago' },
  { price: '$4,900,000', specs: 'Penthouse 4 bed • Vista ciudad', location: 'Monterrey • 6h ago' },
]
jobsBoard = [
  { role: 'Senior React Developer', company: 'Mercasto', salary: '$65k – $85k' },
  { role: 'Restaurant Manager', company: 'La Palapa', salary: '$25,000' },
]
```

(For clarity: `mexicoLocations` and `subcategoriesMap` in the same file are legitimate
reference data — the problem is only the fabricated listings.)

**V2 does not import `mockData` at all**, so it cannot show any of this. That makes the
cutover a strict improvement for §7.

### Latent, not live

Loaded the live production home in a browser and waited past the 3.5 s fallback timer, then
searched for distinctive mock strings:

| Marker | Present on production |
| --- | --- |
| `La Palapa` | no |
| `Senior React Developer` | no |
| `Penthouse 4 bed` | no |
| `Colonia Roma` | no |
| `$1,850,000` | no |
| `Century 21` | no |
| `Harmon Hall` | no |
| `Tlaquepaque` | yes — but this is a real Jalisco location that appears in genuine listings |

So the fabricated content does not reach users today: the real vertical arrays are
populated, and the fallback never activates. It is a latent violation, not a live one — and
V2 deletes it either way.

## 3. Two regressions V2 does introduce around the featured (paid) rail

V2 fetches featured listings with a hardcoded relative path and swallows failures:

```js
// HomeScreenV2.jsx:101
fetch('/api/ads/featured', { headers:{ Accept:'application/json' } })
  .catch(() => {});
// HomeScreenV2.jsx:182
const featuredRows = featured.length ? featured : safeAds.slice(0, 4);
```

The legacy screen does it differently (`HomeScreen.jsx:85-89`):

```js
const API_URL = window.__API_URL__ || import.meta.env?.VITE_API_URL || '/api';
const prefetched = window.__FEATURED_ADS_PROMISE__;
const dataPromise = prefetched ? prefetched : fetch(`${API_URL}/ads/featured`, ...);
```

Three consequences:

1. **The configured API base is ignored.** V2 drops the `window.__API_URL__` and env
   resolution the rest of the app uses, so it only works when the frontend origin happens to
   proxy `/api`.
2. **The server-side prefetch is not reused.** `window.__FEATURED_ADS_PROMISE__` exists so the
   client does not refetch above-the-fold content; V2 ignores it, adding an avoidable request
   on the critical path.
3. **A failed fetch silently mislabels ordinary listings as promoted.** Proven on the
   production build: with `/api/ads/featured` returning 404, the *Destacados* rail rendered
   **exactly the first four items of Tendencias** — i.e. non-featured ads presented in the
   featured placement. Legacy does not do this; on failure it sets the array empty.

Live status: production's `/api/ads/featured` returns **200 with 8 rows**, so the rail is
correct on mercasto.com today. The exposure is environmental (any deployment without the
same-origin `/api` proxy) and transient (a 5xx or rate-limit would silently swap the rail).

## 4. Actions

1. Resolve the featured URL the way the rest of the app does — `window.__API_URL__` /
   configured base — and reuse `window.__FEATURED_ADS_PROMISE__` when present.
2. Do not substitute non-featured listings into a paid placement. If the fetch fails, hide
   the rail or show an explicit empty state; a promoted slot must never be filled with an
   unpromoted ad.
3. `RecommendationsWidget.jsx:53` has the same hardcoded `/api/recommendations/trending`
   pattern. It is shared with the legacy home, so it is not a V2 regression, but it has the
   same fragility.
