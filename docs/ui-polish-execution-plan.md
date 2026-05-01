# Mercasto UI polish execution plan

Status: implementation plan for production UI cleanup.

## Goal

Make Mercasto look and behave like a production classifieds marketplace for Mexico on desktop and mobile without breaking current working flows.

## Hard rules

- Do not break existing routes.
- Do not break auth.
- Do not break publish flow.
- Do not break listing storage/photos.
- Do not break seller account flows.
- Do not break payment/webhook logic.
- Public UI must be Spanish-first.
- Public UI must not show `MVP`, debug text, placeholder copy, raw stack traces or internal provider implementation details.

## Design direction

- Classifieds-first layout.
- Compact header.
- Search/category/listing feed as the center of the UI.
- Clean rounded cards.
- Teal/mint visual system.
- Orange price accent.
- Mobile-first responsive grids.

## Global tokens

Recommended tokens:

```css
:root {
  --color-primary: #0f8f7d;
  --color-mint: #dff7ef;
  --color-price: #f97316;
  --color-text: #1c2434;
  --color-muted: #6b7280;
  --color-border: #d7e3df;
  --color-background: #f3f7f6;
  --color-card: #ffffff;
  --radius-lg: 24px;
  --radius-md: 18px;
  --radius-sm: 14px;
  --shadow-card: 0 12px 30px rgba(15, 40, 50, 0.08);
}
```

## Components to standardize first

1. Header
2. Footer
3. Container/shell widths
4. Buttons
5. Inputs/selects
6. Listing card
7. Badges
8. Alert/flash messages
9. Empty states
10. Mobile bottom navigation/FAB if active

## Page order

### P0 pages

1. Home
2. Catalog/listings
3. Listing detail
4. Login
5. Register
6. Publish
7. Seller dashboard / my listings
8. Pricing / promotions

### P1 pages

1. Favorites
2. Messages
3. Billing
4. Promotions
5. Photo management
6. Admin login

## Home acceptance

- Search block is visible near top.
- Categories are compact, not huge banners.
- Listing cards appear above long marketing blocks.
- No oversized empty hero.
- Mobile layout uses compact feed.
- No debug, MVP or placeholder copy.

## Catalog acceptance

Desktop:

- filters sidebar on left;
- result count and sorting on top;
- 4-column grid when width allows;
- cards have consistent height.

Mobile:

- compact search;
- filter button/drawer;
- stable 2-column grid or intentionally 1-column layout;
- bottom nav/FAB does not cover content.

## Listing card acceptance

Required fields:

- image or safe fallback;
- price;
- title;
- city/state;
- age/time meta;
- favorite action if implemented;
- featured/recent badge when applicable.

Rules:

- title max lines;
- no broken image URLs;
- no raw undefined values;
- card clickable area is consistent.

## Listing detail acceptance

Required sections:

1. gallery;
2. title;
3. price;
4. location/time/views if available;
5. attributes;
6. description;
7. advertiser/contact card;
8. contact CTA;
9. related listings if available.

Do not introduce cart/ecommerce checkout language for classifieds detail.

## Publish acceptance

Required sections:

- ubicación y categoría;
- detalles del anuncio;
- precio;
- contacto;
- fotos;
- plan/promoción only if active.

Rules:

- no raw PHP/Laravel errors;
- validation errors are styled;
- photo upload area is understandable;
- mobile form does not overflow.

## Auth acceptance

Login:

- desktop two-column layout;
- clean form card;
- Spanish labels;
- styled error state;
- register link.

Register:

- desktop 2-column form grid;
- mobile 1-column;
- fields aligned;
- clean CTA;
- duplicate/invalid errors styled.

## Seller account acceptance

- seller sees only own listings;
- status badges are readable;
- edit/pause/activate/delete actions are visually consistent;
- empty state is polished;
- no backend-table raw feel unless intentionally styled.

## Pricing/promotions acceptance

- public copy says payment in user-facing language, not internal provider details;
- paid CTA uses Spanish wording;
- free CTA is clear;
- no raw Clip/debug wording unless product explicitly wants provider branding;
- pricing cards have equal structure and height.

## Technical safety checklist before UI changes

Before changing a page:

- identify current route;
- identify current data variables;
- keep helper usage such as `e()`, `asset_url()`, `route_url()` or React equivalents;
- add fallback values for all optional fields;
- verify no form action changes unless required;
- verify CSRF remains intact;
- verify ownership checks remain server-side.

## Smoke after each page

For each changed page:

- desktop viewport;
- tablet viewport;
- mobile viewport;
- loading state;
- empty state;
- invalid data state;
- at least one real listing/card state.

## Definition of done

UI polish phase is done when:

- P0 pages are visually consistent;
- public UI is Spanish-first;
- no public `MVP`, debug, placeholder or stack trace text remains;
- listing cards are consistent across home/catalog/related blocks;
- mobile layout is usable;
- auth/publish/seller flows still work;
- smoke report is recorded.
