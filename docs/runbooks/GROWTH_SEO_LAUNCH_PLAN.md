# Mercasto Growth and SEO Launch Plan

Owner: Product + Growth + SEO/AEO

Purpose: grow genuine marketplace supply and organic demand without publishing thin, duplicate or misleading search pages.

Related implementation issue: #426

## Positioning

Mercasto is a Mexico-first classifieds marketplace where people can publish, discover and contact advertisers directly.

Approved factual Spanish positioning:

- Compra, vende y renta en México.
- Publica tu anuncio y recibe contacto directo.
- Encuentra autos, servicios, inmuebles, empleos y productos en México.
- Explora anuncios por categoría y ubicación.

Do not use unverified scale, seller-verification, guaranteed-safety, review or “sell faster” claims unless the product and current aggregate data support them.

## SEO architecture

Build indexable pages around three dimensions only after their quality gates pass:

1. category;
2. state or city;
3. search intent.

Current canonical national examples:

- `/motor`
- `/servicios`
- `/inmuebles`
- `/electronica`
- `/productos`

Future location-route shape, blocked until inventory qualification:

- `/motor/jalisco`
- `/motor/jalisco/guadalajara`
- `/servicios/quintana-roo`
- `/turismo/quintana-roo/cancun`

Query/filter variants remain `noindex,follow` and canonicalize to a stable parent page.

## First 20 landing pages

The source of truth is:

- [`../seo/first-20-landing-page-map.json`](../seo/first-20-landing-page-map.json)
- [`../seo/GEO_SEO_BASELINE_2026-08-05.md`](../seo/GEO_SEO_BASELINE_2026-08-05.md)

The map contains:

- 14 existing national category/vertical directories;
- 6 category-location candidates;
- explicit inventory, recency, seller-diversity and location-completeness thresholds;
- a blocked status for every location candidate while genuine active supply is zero.

Do not replace this map with a city-first marketing wish list. Refresh it from production aggregates and Search Console evidence.

## Page requirements

Every approved indexable landing page must include:

- one H1 matching category and location intent;
- unique Spanish title and description;
- factual answer-first introduction;
- genuine qualifying inventory or a clearly labeled factual directory experience;
- internal links to stable parent and related pages;
- publication CTA;
- safety guidance without guarantees;
- FAQ only when based on real product behavior or user questions;
- canonical URL;
- route-appropriate structured data;
- visible update/ownership signals for source/help content.

## Supply qualification

Catalog filler never counts as genuine marketplace inventory.

Before implementing a state-category page, require two weekly snapshots with at least:

- 20 genuine active listings;
- 10 genuine recent listings;
- 8 distinct genuine sellers;
- 2 represented cities;
- 90% location completeness.

Before implementing a city-category page, require two weekly snapshots with at least:

- 12 genuine active listings;
- 8 genuine recent listings;
- 5 distinct genuine sellers;
- complete state and city data.

See the baseline document for national and exit thresholds.

## Seller acquisition before location SEO

The current priority is restoring genuine active supply, not generating more local URLs.

Seller acquisition should measure:

- registration completed;
- first publication completed;
- publication still active after moderation;
- first genuine buyer contact;
- renewal/reactivation after expiry;
- category/state/city completeness.

A city can become an SEO candidate only after supply is durable and diverse enough to serve the search intent.

## Paid ads test plan

Do not scale paid campaigns until publish, search and contact QA passes and landing-page measurement is verified.

### Seller acquisition angles

- Publica tu anuncio en México.
- Muestra tu auto, mueble, celular o servicio a personas interesadas.
- Recibe contacto directo según las opciones disponibles en el anuncio.

### Channels

- Meta and Google Search for measurable high-intent acquisition.
- TikTok when native short-form creative and event measurement are available.
- Do not send paid traffic to thin or blocked GEO pages.

## Outreach script

```text
Hola, estamos desarrollando Mercasto, una plataforma de anuncios clasificados para comprar, vender y encontrar servicios en México.

Puedes publicar tu producto o servicio y recibir contacto directo de personas interesadas.

Estamos incorporando vendedores de [ciudad/categoría]. ¿Quieres que te ayude a revisar el proceso de publicación?
```

## Analytics required

Track:

- landing-page view;
- category or location click;
- search submitted;
- listing viewed;
- publish CTA clicked;
- registration completed;
- listing submitted, moderated and activated;
- WhatsApp/chat/contact click;
- listing expired, renewed or reactivated;
- genuine active supply by category/state/city.

## SEO and GEO risks

- thin pages with no genuine listings;
- duplicate city/category URLs;
- catalog filler presented as current local seller supply;
- unsupported verification, review, scale or guarantee claims;
- incomplete state/city data;
- poor Spanish copy;
- weak internal linking;
- crawler policy changed without product/legal review;
- `llms.txt` treated as a substitute for normal web indexing controls.

## Launch sequence

1. Keep technical index hygiene and category metadata green.
2. Restore and measure genuine active inventory.
3. Publish factual Mercasto source/help pages for GEO citation readiness.
4. Review the first-20 map weekly.
5. Implement one qualifying state route behind tests.
6. Validate canonical, schema, sitemap and Search Console behavior.
7. Expand only after two weekly threshold snapshots and post-launch measurement.

## Output format

```markdown
# Growth and GEO/SEO result

Date:
Owner:
Production snapshot:

## Genuine supply ready

## Pages qualified

## Pages blocked

## Search and AI discovery evidence

## Conversion evidence

## Risks and next actions
```
