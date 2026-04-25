# Mercasto Listing Quality Review Runbook

Owner: Content Quality Agent + Moderation Lead Agent + QA Lead Agent

Purpose: keep public listing feeds credible before launch and before paid traffic.

## Principle

The homepage and category feeds are the storefront. Low-quality listings make the marketplace look unfinished and reduce trust.

## What to review

Review public listings for:

- unclear titles;
- extremely short descriptions;
- placeholder-like content;
- missing or broken images;
- wrong category;
- suspicious seller/contact behavior;
- duplicated listings;
- prohibited items;
- poor Spanish copy.

## Review process

Use the least disruptive process:

1. Identify questionable listings.
2. Review whether the seller looks real.
3. Move questionable listings out of the public launch set through the admin workflow.
4. Ask real sellers to improve weak listings.
5. Keep confirmed demo data separate from production content.

## Manual review checklist

For each listing:

- [ ] Title describes the item or service.
- [ ] Description includes real details.
- [ ] Category is correct.
- [ ] Price is plausible for the category.
- [ ] Location is plausible.
- [ ] At least one image is useful if images are required.
- [ ] Seller profile is not obviously fake.
- [ ] Listing does not violate prohibited-items policy.

## Quality rules for launch

Before launch traffic:

- homepage should not show obvious test content;
- category pages should show credible examples or useful empty states;
- listing detail pages should have enough content to build trust;
- seller dashboard should let users improve weak listings;
- search should not rank weak content above credible listings;
- sitemap should not prioritize weak pages.

## Backend validation follow-up

Create backend validation so future listings require:

- meaningful title;
- meaningful description;
- valid category;
- media rules appropriate for the category;
- friendly Spanish validation messages.

Validation must not break:

- browsing;
- searching;
- report flows;
- payment flows;
- admin moderation.

## Output format

```markdown
# Listing Quality Review Result

Date:
Reviewer:

## Summary
PASS / FAIL

## Listings reviewed

## Listings moved out of launch set

## Listings needing seller edits

## Backend validation follow-up

## Remaining risks
```
