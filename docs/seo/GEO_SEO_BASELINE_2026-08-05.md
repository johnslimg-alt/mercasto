# Mercasto GEO/SEO baseline — 2026-08-05

Owner: Product + SEO/AEO

Related issue: #426

## Scope and method

This baseline combines:

- a read-only production URL, metadata, sitemap and structured-data audit;
- read-only PostgreSQL aggregates for active inventory, recency, seller diversity and location completeness;
- the deployed results of PRs #428 and #429;
- current official crawler documentation from Google, OpenAI, Anthropic and Perplexity.

No names, email addresses, phone numbers, listing descriptions or individual user IDs were exported. Counts are aggregate snapshots and must be refreshed before activating any location page.

## Production baseline

| Metric | Value |
| --- | ---: |
| Active ads | 5,677 |
| Active genuine user ads | **0** |
| Active catalog filler references | 5,677 |
| Genuine archived ads | 174 |
| Genuine expired ads | 48 |
| Genuine rejected ads | 9 |
| Active records without a state | 4,900 |

All currently active records are catalog filler references. They can support factual directory and discovery experiences, but they do not prove current local seller supply.

## Critical stop condition

No state, city or category-location route may become indexable while `active_genuine = 0`.

Creating local pages from catalog filler alone would risk:

- thin or doorway pages;
- misleading local availability claims;
- duplicate pages built from sparse or incomplete locations;
- search and AI answers citing inventory that is not offered by an active Mercasto seller.

The six location routes in `first-20-landing-page-map.json` are candidates only. They are not application routes, sitemap URLs or approved indexable pages.

## Current indexability taxonomy

| Route class | Current policy |
| --- | --- |
| Homepage, `/listings`, active listing details | Indexable with route-specific canonical and metadata |
| 14 national vertical/category directories | Indexable factual directory/reference surfaces; not inventory-qualified |
| Query/filter results | `noindex,follow`, canonical to the stable parent catalog |
| Private/auth/admin routes | `noindex,nofollow,noarchive` |
| Non-sitemap category aliases | `noindex,follow`, canonical to the primary vertical |
| State/city/category-location routes | Blocked from implementation and sitemap until thresholds pass |
| Expired/deleted/sold listing lifecycle | Separate follow-up: retain value only when availability and replacement behavior are truthful |

## Inventory qualification thresholds

Thresholds are deliberately based only on genuine active seller inventory. Catalog filler never counts toward qualification.

### National vertical qualification

A national directory can be described as active marketplace inventory only after it has, at minimum:

- 30 genuine active listings;
- 15 genuine listings created or renewed in the last 90 days;
- 10 distinct genuine sellers;
- supply in at least 3 states;
- at least 80% state/location completeness.

Until then, copy must remain directory-oriented and avoid claims such as “thousands available,” “verified sellers,” or guaranteed supply.

### State-category route qualification

A state-category candidate can enter implementation review only after two consecutive weekly snapshots meet all of these conditions:

- 20 genuine active listings;
- 10 genuine listings created or renewed in the last 90 days;
- 8 distinct genuine sellers;
- supply in at least 2 cities;
- at least 90% location completeness.

### City-category route qualification

A city-category candidate can enter implementation review only after two consecutive weekly snapshots meet all of these conditions:

- 12 genuine active listings;
- 8 genuine listings created or renewed in the last 90 days;
- 5 distinct genuine sellers;
- 100% state and city completeness.

### Exit and anti-flapping policy

A qualified location page should not switch indexability because of one temporary inventory change. If supply stays below 60% of its entry threshold for four consecutive weekly snapshots:

1. set `noindex,follow`;
2. remove it from the sitemap;
3. preserve useful navigation and replacement results;
4. redirect only when another URL serves equivalent intent.

## First 20 landing-page map

The canonical machine-readable source is [`first-20-landing-page-map.json`](./first-20-landing-page-map.json).

The map contains:

- 14 existing national vertical/category directories;
- 6 category-location candidates selected from the strongest catalog-only clusters;
- explicit `blocked_no_genuine_inventory` status for every location candidate;
- required internal-link paths and inventory thresholds.

No location candidate should be coded, linked as an indexable page or added to a sitemap until the snapshot and seller-diversity gates pass.

## GEO source-page plan

GEO work should prioritize primary, factual, citable Mercasto source pages before generating more landing pages.

| Proposed source page | Question answered | Required evidence |
| --- | --- | --- |
| `/como-funciona` | How does Mercasto work? | Actual publish, search and contact flow |
| `/seguridad` | How should buyers and sellers transact safely? | Platform controls and current safety policy |
| `/ayuda/publicar-anuncio` | How can a seller publish? | Current fields, limits, moderation and lifecycle |
| `/ayuda/comprar-y-contactar` | How does a buyer contact a seller? | Current WhatsApp/chat/contact behavior |
| `/tarifas` | What is free and what is paid? | Current pricing and renewal rules |
| `/sobre-mercasto` | Who operates Mercasto and where? | Organization, contact and policy ownership |

Each source page must be answer-first, Spanish-first, visibly dated, owned by Mercasto, internally linked, and consistent with the actual product. It must not contain generated statistics, fake reviews, unverifiable guarantees or placeholder policy language.

## Crawler policy decision

### Search and citation crawlers

Public indexable pages should remain accessible to search/discovery crawlers unless production logs show a security or capacity problem:

- `Googlebot` for Google Search;
- `OAI-SearchBot` for ChatGPT search summaries and citations;
- `PerplexityBot` for Perplexity search results and citations.

OpenAI advertising landing validation may additionally require `OAI-AdsBot` if Mercasto submits ads to that product.

### Training and model-improvement crawlers

Training/model-improvement controls are a separate product and legal decision, not an SEO ranking tactic:

- `Google-Extended` controls Gemini training/grounding use and does not affect Google Search inclusion or ranking;
- `ClaudeBot` can collect public web content for model development and follows robots.txt;
- any decision for `GPTBot`, `ClaudeBot` or `Google-Extended` must be documented before changing robots rules.

This baseline does **not** change `robots.txt`.

### `llms.txt`

Do not add `/llms.txt` now.

Reasons:

- it does not replace robots.txt, canonicals, noindex, sitemaps or structured data;
- current provider guidance for search discoverability focuses on crawler access and normal public web signals;
- implementation should wait until Mercasto has a documented target consumer, supported format and maintenance owner.

## Official crawler references

- Google common crawlers and `Google-Extended`: https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- Google noindex requirements: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- OpenAI publishers FAQ and `OAI-SearchBot`: https://help.openai.com/en/articles/12627856-publishers-and-developers-faq
- OpenAI advertiser crawler guidance: https://help.openai.com/en/articles/20001243-advertiser-guidance-for-allowing-openai-web-crawlers
- Anthropic crawler controls: https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Perplexity crawler controls: https://docs.perplexity.ai/docs/resources/perplexity-crawlers

## Supply-readiness command

The aggregate report is generated with:

```bash
php artisan ads:supply-readiness
php artisan ads:supply-readiness --json
php artisan ads:supply-readiness --json --category=motor --state=Jalisco
```

The report excludes catalog filler from every qualification metric. It emits only aggregate counts, completeness percentages and pass/fail checks; it does not include seller names, email addresses, phone numbers, listing titles, descriptions or individual seller IDs.

## Weekly measurement

Record weekly snapshots for:

- genuine active listings by category, state and city;
- genuine listings created or renewed in the last 90 days;
- distinct genuine sellers;
- state/city/location completeness;
- pages passing or failing each qualification gate;
- Search Console valid/excluded pages, canonical mismatches and sitemap discovery;
- impressions, clicks, CTR and non-brand queries by route type;
- registration, first publication and first contact from organic landing pages;
- identifiable AI/search referrals without inferring attribution that is not present.

## Immediate next actions

1. Restore genuine active supply through renewal/reactivation and seller acquisition.
2. Run and retain the aggregate `ads:supply-readiness --json` report each week.
3. Build the six GEO source pages from current product behavior and policies.
4. Review the first 20 map weekly; do not create local routes until thresholds pass.
5. Re-submit only changed sitemap shards and inspect affected URLs in Search Console after each approved route release.
