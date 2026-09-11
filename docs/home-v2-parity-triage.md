# Home V2 parity triage — verified classification

Companion to `home-v2-parity-audit.md` (mechanical gate) and to
`scripts/home-v2-parity-audit.mjs`. The audit answers *what differs*; this file
answers *what that difference actually means*, with the evidence checked by hand.

Branch: `design/standalone-integration-20260910` · worktree `/root/mercasto-worktrees/home-v2`

## Gate corrections applied (make the matrix trustworthy)

1. **Render-based matching for component features.** The audit originally
   matched bare identifiers, so an unused import counted as a homepage
   capability. `AdSenseBanner` is imported by `HomeScreen.jsx` (line 2) but
   **never rendered** there — it is rendered inside `AdDetailScreen`. The entry
   now matches `<AdSenseBanner`, which correctly reports `n/a` instead of a
   phantom regression. Same hardening applied to `MapV3`,
   `RecommendationsWidget`, `PopularSearchesSection/CitiesSection/NewsletterSection`,
   `FAQSchema`, `ItemListSchema`.
2. **Dark mode.** Already correct in the gate: V2 does not use Tailwind `dark:`
   utilities, it uses `.dark .mercasto-v2` + CSS variables in
   `HomeScreenV2.css`, and the app toggles `document.documentElement.classList`
   (`src/contexts/UIContext.jsx:19`). The `cssAware` lookup covers it, so the
   earlier `MUST MIGRATE` for dark mode was a stale artifact of the pre-fix script.

Result: **must-migrate 14 → 13**, everything else unchanged, no real capability
silently dropped by the correction.

## Root causes behind the 13 remaining items

| # | Root cause | Items | Fix lives in |
|---|---|---|---|
| A | `renderHomeV2Screen()` forwards 22 props; the legacy renderer forwards more | `ads_total`, `auth_user`, `location_state`, `publish_cta` | `src/App.jsx` + `HomeScreenV2.jsx` prop surface |
| B | V2 has no render block for the feature | `recently_viewed`, `discovery_sections`, `map`, `recommendations`, `vertical_re_quickfilters`, `toast` | `HomeScreenV2.jsx` (+ `HomeScreenV2.css`) |
| C | No structured data emitted from the V2 route | `faq_schema`, `itemlist_schema` | `HomeScreenV2.jsx` (head/JSON-LD) |
| D | Filter panel is shallower than legacy | `dynamic_filters`, `location_state` | `HomeScreenV2.jsx` filter panel |

`ads_total` is not only a parity gap — it is a **correctness bug** under ТЗ §7:
V2 renders `safeAds.length.toLocaleString()` as the headline count
(`HomeScreenV2.jsx:135`), i.e. the length of the loaded page rather than the real
result total that legacy takes from the `adsTotal` prop.

## Test-id regressions

10 testids asserted by the existing suite are absent from V2 (see the gate's
"Home testids asserted by the test suite" section). These do not fail today only
because `/` still renders the legacy screen; they become failures the moment
`/design-v2` takes over. Treat as part of the cutover checklist, not as optional.

## Migration default

Default is **migrate everything** — nothing is dropped by accident. Marking an
item `intentionally removed` requires an explicit owner decision recorded in the
`INTENTIONAL` map of the audit script, with a written reason. Candidates the
owner may choose to drop on the homepage (they exist elsewhere in the product):
map block, AI recommendations, popular-searches/cities/newsletter band.

## Planned batches

1. **Wiring + correctness** — extend the V2 prop surface and `App.jsx`; replace
   the fake counter with `adsTotal`; publish CTA.
2. **Head/SEO** — `FAQSchema` + `ItemListSchema` on the V2 route.
3. **Content blocks** — recently viewed, popular searches/cities/newsletter, toast.
4. **Verticals** — real-estate quick filters, map block, recommendations.
5. **Filters depth** — state/city selection, dynamic attribute filters.
6. **Cutover** — testids, `noindex` removal, canonical, `/design-v2` → 301.
