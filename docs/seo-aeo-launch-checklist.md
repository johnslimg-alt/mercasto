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
| Sitemap | Includes important public landing pages and listing/category surfaces | Open |
| Canonicals | Homepage, listings, listing detail and landing pages have canonical URLs | Open |
| OG/Twitter | Homepage, listing detail and share routes have title/description/image metadata | Guarded |
| Structured data | Organization/WebSite/Breadcrumb/ListItem/Product or Offer where appropriate | Open |
| Category landing pages | Indexable category pages for priority marketplace categories | Open |
| State/city landing pages | Mexico-wide state/city landing pages without single-city bias | Open |
| Performance | Core Web Vitals/Lighthouse baseline captured | Open |
| AEO content | Clear marketplace FAQ/help content for common buyer/seller questions | Open |
| Internationalization | Spanish-first copy and stable hreflang/canonical decision | Open |
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
