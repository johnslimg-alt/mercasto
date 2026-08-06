# Category and location taxonomy backlog — 2026-08-06

Owner: Taxonomy + Product + SEO + Backend

Source issue: #127

Status: planning only. No production migration, redirect, category deletion or indexability change is authorized by this document.

Machine-readable companion: `docs/product/category-location-taxonomy-plan.json`.

## Read-only baseline

- Production `categories` is a flat table with 15 rows and no `parent_id`.
- Production has 1 active genuine listing and 5,677 active catalog references.
- The genuine listing has state, city and coordinates; 4,900 catalog references have no state/city.
- The frontend registry contains 32 states and 423 city/municipality labels.
- Current ad storage uses free-text `state`, `city`, `location`, plus numeric latitude/longitude.
- `CDMX` and `Ciudad de México` both occur in production catalog data.
- Catalog filler is excluded from genuine-supply and SEO qualification.

## Confirmed taxonomy drift

- Production stores `motor`; runtime also accepts `coches` and legacy `coches-y-motor`.
- The E2E category seeder still creates separate top-level `coches` and `motor` rows.

- Production uses `inmobiliaria`, while the public canonical route is `/inmuebles`.
- `productos` is a virtual parent for seven storage categories, but the database has no parent relation.
- Seeder-only top-level values include `telefonos`, `deportes`, `bebes`, `informatica` and `coleccionismo`; runtime schema treats these as child/alias concepts.
- Tourism catalog data stores nine child concepts as top-level ad categories while runtime schema assigns them to `turismo`.
- Category labels/descriptions and translation coverage differ between production, seeders and runtime schema.
- `/motor` is canonical, but some UI helpers and breadcrumbs still reference `/autos`.

## Canonical model to preserve

1. Storage slug, display label and public route are separate fields and must not be inferred from one another.
2. `motor`, `inmobiliaria`, `empleo`, `servicios`, `turismo`, `boletos` and `negocios` remain canonical storage verticals.
3. `productos` remains a navigation/SEO parent; genuine ads store the reviewed child category.
4. `tiendas` remains a business-directory surface, not an ad category.
5. Legacy values remain readable/editable through aliases until a measured backfill and deprecation window complete.
6. Free-text custom cities remain navigable only; they never create indexable routes automatically.
7. Catalog references never qualify a category, state or city for SEO activation.

## Slice A — one canonical taxonomy contract

Create one source-neutral contract that lists canonical storage slugs, display labels, public routes, aliases, parents and deprecation state.

Acceptance:

- production API, frontend schema, filters, analytics and seeders can be compared against one canonical map;
- duplicate canonical storage slugs fail a static audit;
- every alias has exactly one target and an explicit lifecycle state;
- no migration runs in this slice.

## Slice B — production/seeder parity

Make `MercastoCategoriesSeeder` produce the same canonical top-level taxonomy as production and model child concepts through the reviewed schema instead of extra top-level rows.

Acceptance:

- fresh isolated E2E databases expose the same top-level category set and labels as production fixtures;
- `coches` does not reappear as a separate canonical row;
- `telefonos`, `deportes`, `bebes`, `informatica` and `coleccionismo` are represented only through approved child/alias mappings;
- the seeder stays idempotent and cannot delete production rows.

## Slice C — shared category normalizer

Use one normalizer in publish, edit, search, API filters and analytics for canonical category, parent and subcategory resolution.

Acceptance:

- `coches`, `motor` and legacy `coches-y-motor/*` resolve to the motor vertical;
- `inmuebles` resolves to storage `inmobiliaria` without changing the public route;

- product and tourism child values retain parent context without becoming duplicate top-level verticals;
- unknown values remain visible for moderation and are never silently remapped;
- contract tests cover reads, writes, filters and analytics dimensions.

## Slice D — publish/edit taxonomy UX

Remove duplicate choices and render parent/child selection from the canonical contract while preserving existing ads.

Acceptance:

- publish shows one vehicle entry, not separate `Coches` and `Motor` choices;
- existing legacy ads open in edit mode with the correct canonical selection;
- product and tourism parents reveal only their reviewed children;
- draft recovery preserves canonical category and subcategory;
- mobile and desktop use identical storage values.

## Slice E — dry-run inventory migration

Build a read-only report before any write migration. It must count every legacy value, proposed target, affected seller, indexable URL and rollback row.

Acceptance:

- dry-run totals reconcile exactly with the source table;
- genuine and catalog rows are reported separately;
- ambiguous mappings are excluded from automatic writes;
- a reversible mapping table and backup/rollback command are reviewed before approval;
- no production update occurs without explicit human approval.

## Slice F — normalized Mexico location registry

Introduce stable state and municipality identifiers while retaining current display fields for compatibility.

Acceptance:

- all 32 states have one canonical code, slug and Spanish display label;
- reviewed municipality/city entries have stable identifiers independent of accents and casing;
- observed aliases such as `CDMX` resolve to `Ciudad de México`;
- custom free-text locations are stored as unmatched until reviewed;
- coordinates remain required for new/edited listings and are validated inside Mexico bounds;
- location normalization never changes catalog filler into genuine supply.

## Slice G — canonical URL and redirect builder

Generate category and location URLs from canonical route metadata rather than ad storage labels.

Acceptance:

- `/motor` remains canonical and `/autos` remains a permanent equivalent redirect;
- `/inmuebles` maps to storage `inmobiliaria` without duplicate indexing;
- aliases, filtered URLs and query variants declare the correct canonical/noindex policy;
- breadcrumbs, internal links and sitemap entries use the same route builder;
- no state/city route is emitted merely because a label exists in the registry.

## Slice H — supply-gated location activation

Connect normalized taxonomy dimensions to the existing weekly genuine-supply snapshots and activation thresholds.

Acceptance:

- national qualification requires 30 active genuine listings, 15 recent, 10 sellers, 3 states and 80% location completeness;
- state-category activation requires 20 active, 10 recent, 8 sellers, 2 cities, 90% completeness and 2 weekly snapshots;
- city-category activation requires 12 active, 8 recent, 5 sellers, 100% completeness and 2 weekly snapshots;
- falling below 60% of threshold for 4 weekly snapshots removes the route from sitemap and applies noindex;
- catalog filler, duplicate sellers and unmatched free-text locations do not satisfy thresholds;
- activation is reviewable and reversible, never automatic from a single snapshot.

## Recommended implementation order

1. Slice A: canonical contract.
2. Slice B: seeder parity.
3. Slice C: shared normalizer.
4. Slice D: publish/edit UX.
5. Slice F: normalized location registry.
6. Slice E: dry-run migration and human review.
7. Slice G: canonical URL builder.
8. Slice H: supply-gated route activation.

## Explicit non-goals

- no mass category deletion or slug rewrite;
- no automatic write backfill from this planning issue;
- no fabricated city/category pages;
- no indexable route based on catalog filler;
- no DNS, CDN, paid-traffic or production-content change;
- no removal of legacy aliases before observed traffic and stored-data usage reach an approved deprecation threshold.
