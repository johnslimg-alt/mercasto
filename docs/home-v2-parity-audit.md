# Home V2 parity audit — Legacy vs V2

Generated: 2026-09-11T00:56:55.850Z

- Legacy: `src/components/screens/HomeScreen.jsx` (1201 lines)
- V2:     `src/components/screens/HomeScreenV2.jsx` (551 lines)

## Verdict

- Features audited: **41**
- V2 implemented: **33**
- V2 only: **1**
- Intentionally removed: **0**
- **MUST MIGRATE: 0**
- Legacy props not accepted by V2: **2**
- App.jsx props not forwarded to V2: **4**
- Home testids asserted by tests but absent in V2: **0**
- V2 i18n keys missing from one or more of the 11 runtime modules: **0**

## Feature matrix

| Feature | Group | Legacy | V2 | Status |
| --- | --- | --- | --- | --- |
| Search submit from home | Discovery | `executeSearch?.(` | `executeSearch?.(` | V2 implemented |
| Category rail | Discovery | `home-category-rail` | `v2-category-rail` | V2 implemented |
| Pricing entry from rail | Discovery | `action === 'pricing'` | `openPricing('design_v2_category_rail')` | V2 implemented |
| Location input | Discovery | `setSearchLocationInput` | `setSearchLocationInput` | V2 implemented |
| State/city selection | Filters | `setSelectedState` | `selectedState` | V2 implemented |
| Min/max price filters | Filters | — | `setMinPrice` | V2 only |
| Dynamic attribute filters | Filters | `dynamicFilters` | `dynamicFilters` | V2 implemented |
| Condition filter | Filters | — | — | n/a |
| Sort control | Filters | — | — | n/a |
| Filters UI on home | Filters | `home-open-filters` | `v2-filter-panel` | V2 implemented |
| Save search alert | Account | `handleSaveSearchAlert` | `handleSaveSearchAlert` | V2 implemented |
| Favourites wiring | Account | — | — | n/a |
| Auth-aware rendering (user prop) | Account | `user }` | `user,` | V2 implemented |
| Recently viewed | Account | `getRecentlyViewed` | `getRecentlyViewed` | V2 implemented |
| Referral hooks | Account | — | — | n/a |
| Ad cards via renderAdCard | Listings | `renderAdCard` | `renderAdCard` | V2 implemented |
| Promoted / featured listings | Listings | `featuredAds` | `featured` | V2 implemented |
| Trending block | Listings | `trending_now` | `trending_now` | V2 implemented |
| Real estate block | Verticals | `realEstateAds` | `realEstateAds` | V2 implemented |
| Jobs block | Verticals | `jobAds` | `jobAds` | V2 implemented |
| Services block | Verticals | `serviceAds` | `serviceAds` | V2 implemented |
| Automotive block | Verticals | `automotiveAds` | `automotiveAds` | V2 implemented |
| Real-estate quick filters (rent/buy/commercial) | Verticals | `home-real-estate-rent` | `home-real-estate-rent` | V2 implemented |
| Map usage on home | Verticals | `<MapV3` | `home-real-estate-map-card` | V2 implemented |
| AI recommendations widget | Listings | `<RecommendationsWidget` | `<RecommendationsWidget` | V2 implemented |
| Accurate total counter (adsTotal) | Listings | `adsTotal` | `adsTotal` | V2 implemented |
| Pricing modal opens | Monetisation | `setShowPricingModal` | `setShowPricingModal` | V2 implemented |
| Promotion CTA | Monetisation | `promote_ad` | `promote_ad` | V2 implemented |
| Ad placements | Monetisation | — | — | n/a |
| Publish CTA / tab switch | Publishing | `setCurrentTab('post')` | `setCurrentTab?.('post')` | V2 implemented |
| How Mercasto works | Publishing | `how_it_works` | `how_it_works` | V2 implemented |
| Popular searches / cities / newsletter | Content | `<PopularSearchesSection` | `<PopularSearchesSection` | V2 implemented |
| Home toast feedback | Content | `home-toast` | `home-toast` | V2 implemented |
| SEO component | SEO | — | — | n/a |
| FAQ structured data | SEO | `<FAQSchema` | `<FAQSchema` | V2 implemented |
| ItemList structured data | SEO | `<ItemListSchema` | `<ItemListSchema` | V2 implemented |
| Home H1 | SEO | `<h1` | `<h1` | V2 implemented |
| Analytics events | Platform | `events.` | `events.` | V2 implemented |
| Cookie/consent interaction | Platform | — | — | n/a |
| Dark mode support | Platform | `dark:` | `dark:` | V2 implemented |
| Uses production t.* keys | Platform | `t.featured_ads` | `t.all` | V2 implemented |

## MUST MIGRATE detail

_None._

## Legacy props not accepted by V2

- `form`
- `getImageUrl`

## App.jsx props not forwarded to V2

- `form`
- `getImageUrl`
- `renderSkeletonCard`
- `viewedAd`

## Home testids asserted by the test suite

| testid | in legacy | in V2 |
| --- | --- | --- |
| `home-category-rail` | yes | yes |
| `home-auto-year-filter` | yes | yes |
| `home-auto-price-filter` | yes | yes |
| `home-auto-filter-row` | yes | yes |
| `home-category-motor` | yes | yes |
| `home-upload-cv` | yes | yes |
| `home-create-job-alert` | yes | yes |
| `home-newsletter-submit` | yes | yes |
| `home-real-estate-rent` | yes | yes |
| `home-open-filters` | yes | yes |
| `home-real-estate-map-card` | yes | yes |
| `home-toast` | yes | yes |

## Imports present only in legacy

- `../../constants/locationsAndCategories`
- `../SEO`
- `../common/AdSenseBanner`
- `../common/SkeletonCard`

## Analytics events

- Legacy: `categorySelected`
- V2: `categorySelected`, `promotionViewed`, `publishStep`

## i18n gate — V2 keys across the 11 runtime language modules

V2 uses **53** distinct `t.*` keys.

_All V2 keys exist in every runtime language module._

