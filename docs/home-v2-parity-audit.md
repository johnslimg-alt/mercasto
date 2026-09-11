# Home V2 parity audit — Legacy vs V2

Generated: 2026-09-11T00:50:29.999Z

- Legacy: `src/components/screens/HomeScreen.jsx` (1202 lines)
- V2:     `src/components/screens/HomeScreenV2.jsx` (383 lines)

## Verdict

- Features audited: **41**
- V2 implemented: **26**
- V2 only: **1**
- Intentionally removed: **0**
- **MUST MIGRATE: 7**
- Legacy props not accepted by V2: **5**
- App.jsx props not forwarded to V2: **7**
- Home testids asserted by tests but absent in V2: **8**
- V2 i18n keys missing from one or more of the 11 runtime modules: **0**

## Feature matrix

| Feature | Group | Legacy | V2 | Status |
| --- | --- | --- | --- | --- |
| Search submit from home | Discovery | `executeSearch?.(` | `executeSearch?.(` | V2 implemented |
| Category rail | Discovery | `home-category-rail` | `v2-category-rail` | V2 implemented |
| Pricing entry from rail | Discovery | `action === 'pricing'` | `openPricing('design_v2_category_rail')` | V2 implemented |
| Location input | Discovery | `setSearchLocationInput` | `setSearchLocationInput` | V2 implemented |
| State/city selection | Filters | `setSelectedState` | `setSelectedState` | V2 implemented |
| Min/max price filters | Filters | — | `setMinPrice` | V2 only |
| Dynamic attribute filters | Filters | `dynamicFilters` | — | MUST MIGRATE |
| Condition filter | Filters | — | — | n/a |
| Sort control | Filters | — | — | n/a |
| Filters UI on home | Filters | `home-open-filters` | `v2-filter-panel` | V2 implemented |
| Save search alert | Account | `handleSaveSearchAlert` | `handleSaveSearchAlert` | V2 implemented |
| Favourites wiring | Account | — | — | n/a |
| Auth-aware rendering (user prop) | Account | `user }` | — | MUST MIGRATE |
| Recently viewed | Account | `getRecentlyViewed` | — | MUST MIGRATE |
| Referral hooks | Account | — | — | n/a |
| Ad cards via renderAdCard | Listings | `renderAdCard` | `renderAdCard` | V2 implemented |
| Promoted / featured listings | Listings | `featuredAds` | `featured` | V2 implemented |
| Trending block | Listings | `trending_now` | `trending_now` | V2 implemented |
| Real estate block | Verticals | `realEstateAds` | `realEstateAds` | V2 implemented |
| Jobs block | Verticals | `jobAds` | `jobAds` | V2 implemented |
| Services block | Verticals | `serviceAds` | `serviceAds` | V2 implemented |
| Automotive block | Verticals | `automotiveAds` | `automotiveAds` | V2 implemented |
| Real-estate quick filters (rent/buy/commercial) | Verticals | `home-real-estate-rent` | — | MUST MIGRATE |
| Map usage on home | Verticals | `<MapV3` | — | MUST MIGRATE |
| AI recommendations widget | Listings | `<RecommendationsWidget` | — | MUST MIGRATE |
| Accurate total counter (adsTotal) | Listings | `adsTotal` | `adsTotal` | V2 implemented |
| Pricing modal opens | Monetisation | `setShowPricingModal` | `setShowPricingModal` | V2 implemented |
| Promotion CTA | Monetisation | `promote_ad` | `promote_ad` | V2 implemented |
| Ad placements | Monetisation | — | — | n/a |
| Publish CTA / tab switch | Publishing | `setCurrentTab('post')` | — | MUST MIGRATE |
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

### Dynamic attribute filters  `dynamic_filters`

- Group: Filters
- Legacy evidence: `dynamicFilters`
- V2 evidence: none

### Auth-aware rendering (user prop)  `auth_user`

- Group: Account
- Legacy evidence: `user }`
- V2 evidence: none

### Recently viewed  `recently_viewed`

- Group: Account
- Legacy evidence: `getRecentlyViewed`
- V2 evidence: none

### Real-estate quick filters (rent/buy/commercial)  `vertical_re_quickfilters`

- Group: Verticals
- Legacy evidence: `home-real-estate-rent`
- V2 evidence: none

### Map usage on home  `map`

- Group: Verticals
- Legacy evidence: `<MapV3`
- V2 evidence: none

### AI recommendations widget  `recommendations`

- Group: Listings
- Legacy evidence: `<RecommendationsWidget`
- V2 evidence: none

### Publish CTA / tab switch  `publish_cta`

- Group: Publishing
- Legacy evidence: `setCurrentTab('post')`
- V2 evidence: none


## Legacy props not accepted by V2

- `form`
- `getImageUrl`
- `handleViewAd`
- `selectedState`
- `user`

## App.jsx props not forwarded to V2

- `form`
- `getImageUrl`
- `handleViewAd`
- `renderSkeletonCard`
- `selectedState`
- `user`
- `viewedAd`

## Home testids asserted by the test suite

| testid | in legacy | in V2 |
| --- | --- | --- |
| `home-category-rail` | yes | no |
| `home-auto-year-filter` | yes | no |
| `home-auto-price-filter` | yes | no |
| `home-auto-filter-row` | yes | no |
| `home-category-motor` | yes | no |
| `home-upload-cv` | yes | yes |
| `home-create-job-alert` | yes | yes |
| `home-newsletter-submit` | no | no |
| `home-real-estate-rent` | yes | no |
| `home-open-filters` | yes | no |
| `home-real-estate-map-card` | yes | no |
| `home-toast` | yes | yes |

## Imports present only in legacy

- `../../constants/locationsAndCategories`
- `../../utils/homeMapCopy`
- `../../utils/imageHelpers`
- `../../utils/localeFormat`
- `../../utils/localize`
- `../../utils/recentlyViewed`
- `../SEO`
- `../common/AdSenseBanner`
- `../common/SkeletonCard`

## Analytics events

- Legacy: `categorySelected`
- V2: `categorySelected`, `promotionViewed`, `publishStep`

## i18n gate — V2 keys across the 11 runtime language modules

V2 uses **47** distinct `t.*` keys.

_All V2 keys exist in every runtime language module._

