# Homepage Visual Smoke Checklist

Owner: Frontend QA Agent + UI/UX Specialist

Purpose: protect the homepage from visual regressions while Mercasto refactors components and adds vertical pages.

Run this checklist after any frontend change that touches `App.jsx`, `HomeScreen.jsx`, listing cards, categories, filters, or shared layout.

## Viewports

Check at minimum:

- Mobile: 390 x 844
- Tablet: 768 x 1024
- Desktop: 1440 x 900

## Global checks

- [ ] Page renders without a blank screen.
- [ ] Header is visible and not overlapping content.
- [ ] Logo is readable.
- [ ] Search input is easy to find.
- [ ] Primary publish/sell action is visible.
- [ ] Text contrast is readable.
- [ ] No horizontal overflow on mobile.
- [ ] No broken icons.
- [ ] No broken image placeholders in main sections.
- [ ] Language copy is Spanish-first for public users.

## Hero / stats bar

- [ ] Stats row fits mobile or wraps cleanly.
- [ ] Main CTA buttons remain tappable.
- [ ] Location text does not overflow.
- [ ] Buttons do not collide on small screens.

## Categories section

- [ ] Category icons render.
- [ ] Category names are readable.
- [ ] Category grid does not overflow.
- [ ] Tapping a category moves to results.
- [ ] Empty category data fallback still looks acceptable.

## Results mode

Trigger by selecting a category or search.

- [ ] Mobile filter button appears.
- [ ] Sidebar filters show on desktop.
- [ ] Listing grid uses correct columns.
- [ ] Loading state is visible.
- [ ] Empty state is clear.
- [ ] Infinite-scroll loader does not cover cards.

## Listing cards

- [ ] Image ratio is consistent.
- [ ] Price is visible.
- [ ] Title is readable.
- [ ] Location is visible or gracefully absent.
- [ ] Card action buttons do not overlap content.
- [ ] Favorite/share/contact controls remain tappable if shown.

## Trending section

- [ ] Horizontal scroll works on mobile.
- [ ] Cards snap or scroll naturally.
- [ ] AdSense banner placement does not break grid.
- [ ] Section title and CTA are visible.

## Real estate section

- [ ] Cards render with image, price, and location.
- [ ] Map preview does not block scrolling.
- [ ] Buttons fit mobile.
- [ ] Section remains useful if map fails to load.

## Jobs section

- [ ] Table is usable on desktop.
- [ ] Mobile layout does not overflow.
- [ ] Action buttons stay visible.
- [ ] Long job names do not break layout.

## Services section

- [ ] Provider cards show image, title, rating, description, and price.
- [ ] Contact/reserve action is visible.
- [ ] Cards are readable on mobile.
- [ ] Badge labels do not overflow.

## Automotive section

- [ ] Vehicle cards or filters render correctly.
- [ ] Brand buttons fit or wrap cleanly.
- [ ] Section CTA is visible.
- [ ] Mobile layout remains usable.

## Seller promotion card

- [ ] Promotion CTA is visible.
- [ ] Text is readable.
- [ ] Button routes to publish flow.

## Dark mode / theme check

If dark mode is enabled:

- [ ] Background and cards have enough contrast.
- [ ] Text remains readable.
- [ ] Borders and shadows still separate sections.
- [ ] Inputs and buttons are visible.

## Pass / fail template

```markdown
# Homepage Visual Smoke Result

Date:
Commit/PR:
Reviewer:
Viewport(s):

## Result
PASS / FAIL

## Critical layout issues

## Mobile issues

## Desktop issues

## Follow-up issues created
```

## Release rule

- Blank screen blocks release.
- Broken mobile homepage blocks paid traffic.
- Broken publish CTA blocks launch.
- Minor spacing/copy issues can be tracked as follow-ups.
