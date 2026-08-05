# SEO and AEO launch checklist

This checklist defines the SEO/AEO work required before public marketing. It complements `scripts/seo-public-audit.sh` and public Playwright smoke tests.

## Current automated basics

- `/robots.txt` returns 200.
- `/sitemap.xml` returns 200.
- Public routes render without server errors in smoke tests.
- Share OG smoke exists for listing share pages.

## P1 SEO/AEO requirements

| Area | Requirement | Status |
| --- | --- | --- |
| Robots | Production robots allows intended crawl surfaces and blocks internal/private surfaces | Guarded |
| Sitemap | Includes important public landing pages and listing/category surfaces | Automated and live; final URL sample recorded below |
| Canonicals | Homepage, listings, listing detail and landing pages have canonical URLs | Route-specific server shell implemented; production verification pending |
| OG/Twitter | Homepage, listing detail and share routes have title/description/image metadata | Route-specific server shell implemented; production verification pending |
| Structured data | Organization/WebSite/Breadcrumb/ListItem/Product or Offer where appropriate | WebSite, CollectionPage and Product implemented; breadcrumb expansion deferred |
| Category landing pages | Indexable category pages for priority marketplace categories | Open |
| State/city landing pages | Mexico-wide state/city landing pages without single-city bias | Open |
| Performance | Core Web Vitals/Lighthouse baseline captured | Complete: `docs/perf/lighthouse-report.md` |
| AEO content | Clear marketplace FAQ/help content for common buyer/seller questions | Public help content exists; search-query coverage review pending |
| Internationalization | Spanish-first copy and stable hreflang/canonical decision | Spanish-first canonical URLs; no hreflang until localized indexable routes exist |
| Indexing | Google Search Console property and sitemap submission | Manual evidence required |

## Required evidence before public marketing

- `npm run smoke:seo` output.
- Playwright public smoke artifact.
- Lighthouse or equivalent report for homepage, listings and listing detail.
- Sitemap URL list reviewed.
- OG/share preview checked for a real listing.
- Search Console property or equivalent indexing setup recorded.

## Stop conditions

Do not start SEO/paid/public marketing if:

- robots/sitemap fail;
- homepage or listing detail has public stack traces;
- sensitive/internal routes are indexable;
- listing pages lack stable public metadata;
- Mexico-wide location logic regresses to a single-city launch surface.

## Category and Mexico location plan

- Keep the current priority category surfaces (`/autos`, `/inmuebles`, `/empleos`, `/servicios`, `/productos` and tourism/store surfaces) as the first indexable vertical set.
- Expand category metadata and breadcrumbs from the existing category sitemap rather than creating duplicate query-string URLs.
- Add state landing pages only when each page has useful inventory and unique copy; use stable normalized state slugs and canonicalize filter/query variants to that path.
- Add city pages after state pages, with minimum inventory/content thresholds to avoid thin indexable pages.
- Do not reintroduce Puerto Vallarta-only assumptions; all location pages must use the Mexico-wide state/city data source.

## Verified evidence — 2026-08-04

- `npm run smoke:seo` passed against production.
- `robots.txt`, sitemap index and sitemap shards returned 200 with expected content types.
- Fresh Lighthouse 13.0.1 audits were captured for five required routes in mobile and desktop modes.
- The audit identified incorrect initial canonical/OG metadata for `/listings` and `/ads/{id}`; this branch adds server-decorated SPA shells and regression coverage.
- The audit identified CSP-blocked TikTok and Meta scripts; this branch adds only the two official script origins to `script-src`.
- Search Console property verification and sitemap submission remain manual account evidence and are the only external indexing step not completed by repository/server automation.
