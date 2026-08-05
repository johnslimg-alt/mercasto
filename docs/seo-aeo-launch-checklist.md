# SEO, GEO and AEO launch checklist

This checklist defines the public-search and AI-discovery controls required before expanding Mercasto landing pages. It complements `scripts/seo-public-audit.sh`, `scripts/seo-route-shell-gate.sh`, public Playwright smoke tests and issue #426.

## Current production status — 2026-08-05

| Area | Requirement | Status |
| --- | --- | --- |
| Robots | Production robots allows intended crawl surfaces and does not replace page-level noindex | Guarded and live |
| Sitemap | Includes canonical public surfaces only | Guarded and live |
| Canonicals | Homepage, listings, listing detail and vertical pages have stable canonicals | Verified live |
| Private/filter routes | Auth/private routes and query/filter results cannot enter the index unintentionally | Guarded and live |
| Language | Spanish-first public shell declares `es-MX` | Guarded and live |
| OG/Twitter | Public routes expose route-appropriate title, description, URL and image metadata | Guarded; real share preview remains periodic QA |
| Structured data | WebSite, CollectionPage, BreadcrumbList and listing schema where appropriate | Implemented and guarded |
| Category landing pages | 14 national vertical/category directories with unique metadata and one H1 | Implemented and live |
| Category aliases | Non-sitemap aliases are noindex and canonicalize to a primary vertical | Implemented and live |
| State/city landing pages | Implement only after genuine inventory thresholds pass | **Blocked: active genuine inventory is 0** |
| Performance | Mobile/desktop baseline and focused optimization evidence | Complete under #415 |
| AEO/GEO source pages | Factual answer-first help/about/safety/pricing sources | Planned under #426 |
| AI crawler policy | Search/citation crawlers separated from training/model-improvement crawlers | Documented; no robots change in baseline |
| `llms.txt` | Add only for a documented supported consumer and maintenance owner | Deferred |
| Internationalization | Spanish-first canonical URLs; no hreflang until separate localized indexable routes exist | Guarded |
| Search Console | Property verified, sitemap submitted and successful | Verified manually and recorded |
| Measurement | Weekly genuine-supply, Search Console and conversion report | Pending implementation |

## Required evidence before adding any indexable landing page

- stable canonical URL and route taxonomy entry;
- one unique H1, title and description;
- factual visible copy consistent with the product;
- route-appropriate structured data;
- internal-link path from an existing canonical page;
- sitemap entry only after indexability approval;
- genuine active inventory, recency, seller-diversity and location-completeness thresholds;
- Playwright indexability/canonical test;
- static contract preventing duplicate or unsupported metadata;
- Search Console URL inspection after deployment;
- conversion tracking for registration, first publication and first contact.

## Stop conditions

Do not launch or index a new page if any condition applies:

- robots, sitemap, canonical or structured-data verification fails;
- the route is a private, admin, debug, auth or parameter-only surface;
- the page has no genuine active seller inventory when its intent promises current local supply;
- catalog filler is being counted as genuine marketplace supply;
- state/city information is incomplete or inconsistent;
- the page duplicates a stable parent or filter result;
- copy contains fabricated scale, review, seller-verification, safety or availability claims;
- mobile performance, accessibility or browser smoke regresses;
- crawler policy changes without product/legal review.

## Category and location policy

- Keep the 14 national vertical/category routes as factual directory/reference surfaces.
- Do not describe a national directory as inventory-qualified until its genuine-supply threshold passes.
- Keep query/filter variants `noindex,follow` and canonicalize them to a stable parent page.
- Add a state-category page only after two consecutive weekly snapshots satisfy its threshold.
- Add a city-category page only after two consecutive weekly snapshots satisfy its higher threshold.
- If a qualified page remains below 60% of its entry threshold for four weekly snapshots, noindex it and remove it from the sitemap.
- Redirect only when another route serves equivalent intent; otherwise preserve useful navigation and replacement results.

The machine-readable route candidates and thresholds are in:

- `docs/seo/first-20-landing-page-map.json`
- `docs/seo/GEO_SEO_BASELINE_2026-08-05.md`

## GEO source-page checklist

Before asking search or AI systems to cite Mercasto, publish and maintain factual primary sources for:

- how Mercasto works;
- buyer and seller safety;
- publishing and moderation;
- buying and contacting an advertiser;
- pricing, renewal and promotion;
- organization, ownership and contact details.

Every source page must:

- answer the core question near the top;
- identify Mercasto as the publisher/owner;
- show a visible update date;
- link to relevant primary policy or product pages;
- avoid generated statistics or unsupported guarantees;
- remain synchronized with the actual application.

## Crawler policy

- Allow normal crawling of approved public pages for Googlebot, OAI-SearchBot and PerplexityBot unless logs show a capacity/security problem.
- OAI-AdsBot is relevant if Mercasto submits ChatGPT Ads landing pages.
- Allow Google-Extended for Gemini grounding; block GPTBot and ClaudeBot because separate search crawlers remain allowed.
- Keep noindex pages crawlable so compatible search crawlers can read the noindex directive.
- Do not publish `llms.txt`; the obsolete file was removed and it cannot replace robots, sitemap, canonical, noindex or schema.

## Verified evidence

### 2026-08-04

- Search Console property verified.
- `/sitemap.xml` submitted successfully.
- Fresh Lighthouse audits captured for five required routes.

### 2026-08-05

- PR #428 deployed: `es-MX`, page-level index hygiene and canonical sitemap cleanup.
- PR #429 deployed: 14 unique vertical metadata contracts, CollectionPage/BreadcrumbList schema, one H1 and 11 noindex aliases.
- Live audit passed 14/14 verticals and 11/11 aliases.
- Read-only production aggregates found 5,677 active catalog filler references and **0 active genuine user listings**.
- State/city page rollout was blocked until genuine supply thresholds pass.
