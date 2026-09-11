# Home V2 — findings register

Single index of everything the verification pass found, with severity, owner and evidence.
Produced from the hybrid branch (`design/hybrid-card-catalog`); every item links to a document
containing the measurements behind it.

Nothing here has been fixed. Production was not touched and no cutover was performed.

## Blockers for production readiness

| # | Finding | Severity | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | ~~**CLS 0.4444 desktop / up to 0.7935 mobile** against the ТЗ target of < 0.1.~~ **FIXED on this branch** (`bb91d4a5`): sections now reserve their geometry with skeletons while the feed is pending. Measured desktop **0.4444 → 0.0030**, mobile → **0.0239**, matching the ideal stable-payload baseline. | ~~High~~ resolved | **Fixed** | `docs/home-v2-performance-audit.md` |
| 2 | ~~**The paid *Destacados* rail can silently show unpromoted ads.**~~ **FIXED on this branch** (`b4a699ec`): `featuredRows` is now `featured`, and the rail consumes the shell's `window.__FEATURED_ADS_PROMISE__` instead of refetching. Verified: one request total (the shell's, zero duplicates), 0 items on a 500 instead of a copy of the trending list, CLS 0.0023/0.0239 on the success path. | ~~High~~ resolved | **Fixed** | `docs/home-v2-real-data-audit.md` |
| 3 | **V2 branch is behind `origin/main` on #1100** (public/storage image URL normalisation), and V2 resolves listing thumbnails through that helper. Fixed on the hybrid branch via a conflict-free merge; the V2 branch itself still needs it. | **High** | Open on the V2 branch | merge commit `1d513be3` |

## Functional gaps

| # | Finding | Severity | Owner | Evidence |
| --- | --- | --- | --- | --- |
| 4 | ~~Featured fetch ignores the server prefetch.~~ **FIXED** (`b4a699ec`). **Correction to the original wording:** I wrote that V2 "drops the `window.__API_URL__` / env resolution the rest of the app uses" — that was overstated. Nothing in the repository ever *sets* `window.__API_URL__` (the only occurrence is the read in the legacy screen) and `VITE_API_URL` is not a configured variable, so legacy's chain is inert and both screens use the relative `/api`. V2 now keeps the relative base on purpose, matching the shell's own prefetch URL. | ~~Medium~~ resolved | **Fixed / corrected** | `docs/home-v2-real-data-audit.md` |
| 5 | ~~**No filter analytics event exists anywhere in `src/`.**~~ **FIXED** (`9ece7c51`): `filterOpened` and `filterApplied` added, with `filterApplied` emitted from the shared search path so all surfaces are covered. Verified live from the V2 panel, the catalog sheet and a filtered search. | ~~Medium~~ resolved | **Fixed** | `docs/home-v2-analytics-audit.md` |
| 6 | ~~**`favoriteAdded` has zero call sites.**~~ **FIXED** (`9ece7c51`): emitted from `handleToggleFavorite` on an actual add, using the `listingAnalyticsParams` convention so the vendor bridges get `content_id`/`listing_id`/`category`. Verified end to end with a mocked session. | ~~Medium~~ resolved | **Fixed** | `docs/home-v2-analytics-audit.md` |
| 7 | **The custom language menu is enabled on one route only.** `useCustomLanguageMenu` is keyed to `/design-v2`; `/`, `/listings` and the ad-detail route still render `desktop-language-select`. After cutover only `/` would get the custom menu. One-line condition change. | Medium | `App.jsx` | `docs/home-v2-language-selector-audit.md` |
| 8 | **Price list duplicated in three places**, and `PaymentController` never reads the `payment_products` table — so the seeder is not authoritative for checkout. All three agree today (99/249/599/1499). | Medium | backend | `docs/home-v2-monetization-audit.md` |
| 9 | **Leaflet raster tiles stay light in dark mode.** `leaflet-dark-overrides.css` darkens controls but not the tile pane, so dark mode shows dark controls on a light canvas. Shared component; the V2 home is unaffected because it defers the map. | Low | shared map | `docs/home-v2-dark-mode-audit.md` |

## Product decisions needed

| # | Question | Why it matters | Evidence |
| --- | --- | --- | --- |
| 10 | **Should catalog-filler listings count as card impressions?** `AdCard` skips the impression observer for `is_catalog_filler` (pre-existing). With the catalogue at 32/32 filler, the home currently emits **zero** `ad_impression` events, so card CTR cannot be measured against the legacy home after launch. | Blocks the §13 legacy-vs-V2 comparison | `docs/home-v2-analytics-audit.md` |
| 11 | **Is hreflang in scope?** It cannot be added as metadata: language lives only in `localStorage`, so all 11 languages share one URL and there is nothing for `hreflang` to reference. Delivering it means URL-level internationalization (routing + canonical/alternate + sitemap + shell). Today crawlers only see the Spanish rendering. | Architecture scope, not a tag | `docs/home-v2-seo-audit.md` |
| 12 | **Should the card show seller name / verification?** It shows price, title, location, condition, recency, views, promoted badge and photo count, but no seller identity and no verified marker (only a `PRO` badge for `role === 'business'`). Data is already on `ad.user`. | Trust signals | `docs/home-v2-ad-card-audit.md` |
| 13 | **Does "remove the system `<select>`" (ТЗ §4) cover filter selects?** The language selector is one thing; 33 US states in a native select is another, and the e2e suite drives them via `selectOption`. | Scope | `docs/home-v2-language-selector-audit.md` |

## Verified clean (no action)

| Area | Result | Evidence |
| --- | --- | --- |
| Parity legacy vs V2 | 41 features, **0 must-migrate, 0 testid breaks, 0 i18n gaps** | `scripts/home-v2-parity-audit.mjs`, `docs/home-v2-parity-audit.md` |
| Geometry | 48 checks across 12 widths × large fonts × 2 routes, **0 failing** | documented in the performance audit |
| Scrollbar (§3) | 10 scroll surfaces, **10 with the bar hidden**, all genuinely scrollable | `docs/home-v2-scrollbar-verification.md` |
| Search/URL (§5) | shareable, survives reload, filtered URLs `noindex,follow`, canonical on root | `docs/home-v2-search-url-verification.md` |
| SEO metadata (§12) | title, description, canonical, all OG/Twitter tags and both JSON-LD blocks identical to the legacy home | `docs/home-v2-seo-audit.md` |
| Ad card (§6) | price+unit, all four badges, 48px favourite, photo count, placeholder, lazy loading, long/multi-language titles — **0 problems** | `docs/home-v2-ad-card-audit.md` |
| Real data (§7) | V2 has no mocks and **removes** the legacy `mockData` fallbacks (latent, not live on production) | `docs/home-v2-real-data-audit.md` |
| Dark mode (§9) | V2 home: **0 large light surfaces** at both breakpoints | `docs/home-v2-dark-mode-audit.md` |
| Checkout integrity (§14) | server-authoritative; the client amount is discarded, only `credits_custom` honours it and is bounded 50–5000 | `docs/home-v2-monetization-audit.md` |
| Chunk discipline (§11) | `/design-v2` loads **no** Map / Charts / Admin chunk; the legacy home loads MapV3 + Leaflet | `docs/home-v2-performance-audit.md` |
| Static security gates (§15) | `check:static-safety`, `check:security-audit`, `check:scripts`, `check:npm-audit-policy` all exit 0 | performance audit |
| E2E on a production build | 101 passing (55 card/catalog/header/mobile + 46 ad-detail), 0 failing | hybrid branch |
| Contract tests | 341 / 341 | hybrid branch |

## Still open outside this pass

- **§10 accessibility (axe, keyboard journey)** — owned by the other session; not re-verified here.
- **§15 network security probes** (`smoke:security`, `smoke:session-security`,
  `smoke:route-audit`) — these target `https://mercasto.com` by default and were deliberately
  left to the cutover window.
- **§18 backup / rollback execution** — prepared in `docs/home-v2-cutover-plan.md` §2, not run.
- **Owner visual approval** — the explicit cutover gate.
