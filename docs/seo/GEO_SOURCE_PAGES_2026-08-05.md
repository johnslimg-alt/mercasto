# Mercasto factual GEO source pages

Updated: 2026-08-05  
Owner: Mercasto product and engineering

## Purpose

These pages are the canonical, Mercasto-owned sources for product behavior, trust, pricing, and company identity. They are designed for people, search engines, and answer systems without inventing market coverage, transaction guarantees, response times, or seller verification.

## Canonical pages

| Path | Primary answer |
|---|---|
| `/como-funciona` | How listings, moderation, contact, and direct agreements work |
| `/seguridad` | How users should verify before paying and report risk |
| `/ayuda/publicar-anuncio` | How to create, moderate, activate, edit, and renew a listing |
| `/ayuda/comprar-y-contactar` | How to search, verify, and contact a seller |
| `/tarifas` | Current free lifetime, renewal price, and promotion prices |
| `/sobre-mercasto` | What Mercasto is, what it does, and what it does not guarantee |

## Product facts encoded

- Eligible listing activation is free for seven days.
- Renewal costs 49 MXN for seven additional days.
- Current optional promotion prices are sourced from the payment product catalog.
- Mercasto facilitates contact but does not process or guarantee private transactions.
- Verification signals do not guarantee a seller, listing, or transaction.
- Moderation can be automated, manual, or combined.
- Material edits can trigger a new moderation pass.

## Search and answer-system contract

Each page must keep:

- one visible Spanish H1;
- an answer-first summary above the fold;
- a visible `dateModified` equivalent;
- a canonical URL and indexable initial server response;
- WebPage or AboutPage, BreadcrumbList, Organization, and WebSite structured data;
- factual internal links to related Mercasto policies and guides.

Legacy aliases `/safety` and `/acerca-de` redirect permanently to the canonical Spanish routes. English legacy aliases for terms, privacy, and help also redirect to their maintained pages.

## Location-page boundary

These source pages do not authorize state or city landing pages. Location pages remain fail-closed until the privacy-safe supply-readiness report records two qualifying weekly snapshots with genuine active supply, seller diversity, and complete locations. Catalog filler never counts toward qualification.

## Update process

When prices, listing lifetime, contact channels, or moderation behavior change:

1. update the product code and tests;
2. update `src/content/geoSourcePages.js` and `backend/config/seo_source_pages.php` in the same pull request;
3. update the visible date;
4. run `scripts/geo-source-pages-gate.sh` and the full static safety suite;
5. verify initial HTML, canonical tags, JSON-LD, redirects, and sitemap entries in production.
