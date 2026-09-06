# Mercasto Clip-Only Monetization Plan

Owner: CFO Agent + Accountant + Economist + Business Auditor

Purpose: define the first revenue model without overbuilding payment complexity.

## Principle

Mercasto should monetize seller visibility and trust, not block basic marketplace liquidity.

Start with simple products:

1. paid listing boosts;
2. PRO seller account;
3. featured store;
4. Autos package;
5. Services package.

All payments should use Clip only unless the owner changes this strategy.

## Phase 1: no-code / manual validation

Before full automation, validate willingness to pay manually:

- create pricing page draft;
- let sellers request boost/PRO;
- collect payment through Clip link if needed;
- manually activate promotion/admin flag;
- track conversions.

## Current product catalog and pricing baseline

The repository already has concrete Clip product codes and prices. Treat these as the current product baseline, not as proof that market willingness-to-pay has been validated.

| Product code | Current price | Current role |
|---|---:|---|
| `package_free` | 0 MXN/month | 3 active listings |
| `package_impulso` | 99 MXN/month | 10 active listings |
| `package_negocio` | 249 MXN/month | 30 active listings |
| `package_pro` | 599 MXN/month | 100 active listings |
| `package_agencia` | from 1,499 MXN/month | 300–500 active listings |
| `boost_1_day` | 19 MXN | lift for 24 hours |
| `boost_3_days` | 49 MXN | lift for 3 days |
| `highlight_7_days` | 79 MXN | highlighted for 7 days |
| `featured_7_days` | 149 MXN | featured for 7 days |
| `featured_30_days` | 399 MXN | featured for 30 days |
| `top_category_7_days` | 399 MXN | top-category placement for 7 days |

Source of truth for executable product codes remains backend code/database seeding and server-authoritative payment validation. Public copy must not drift from those values.

## Analytics required before launch

Track:

- listing published;
- listing approved;
- listing viewed;
- WhatsApp/contact click;
- seller dashboard opened;
- boost CTA viewed;
- boost CTA clicked;
- payment link opened;
- paid boost activated;
- PRO activated;
- report submitted;
- listing rejected.

## Unit economics model

Use a variable-driven model instead of inventing operating-cost assumptions. Before a paid launch, finance must fill the current monthly fixed costs and measured variable support/moderation costs.

For the integrated Clip Checkout path, the official Clip checkout page currently states a 3.6% fee plus IVA per successful transaction. With 16% IVA applied to that fee, the planning baseline is an effective processing load of `0.036 × 1.16 = 0.04176`, or 4.176% of gross payment value. This external fee must be re-verified immediately before launch or whenever Clip changes commercial terms.

For a product with gross price `P`:

- `clip_fee = P × clip_effective_rate`
- `net_after_clip = P - clip_fee`
- `contribution = net_after_clip - variable_support - variable_moderation_ai - expected_refund_dispute_cost`
- `contribution_margin_pct = contribution / P`

For a monthly mix of paid products:

- `monthly_contribution = Σ(units_i × contribution_i)`
- `operating_result = monthly_contribution - fixed_monthly_costs`
- `break_even_units_for_product_i = ceil(fixed_monthly_costs / contribution_i)` when modelling a single-product scenario

Required finance inputs before activation:

- infrastructure and observability monthly cost;
- AI/local compute cost attributable to paid usage, if any;
- moderation cost per paid listing/seller;
- support cost per paid seller;
- measured refund/dispute rate and expected loss;
- taxes/accounting costs not already represented in the Clip processing fee;
- current Clip fee and payout timing;
- paid-product conversion and churn from actual funnel data.

Do not interpret gross payment value as revenue contribution. Pricing approval should compare contribution margin and seller value, not only top-line price.

## Product rules

### Listing boosts

- Boost should improve ranking but not hide organic listings completely.
- Boosted listings must be labeled.
- Fraud/scam listings must never be boosted.
- Rejected/pending listings cannot be boosted.

### PRO seller

Possible benefits:

- increased monthly listing limit;
- seller badge;
- storefront page;
- basic analytics;
- faster moderation queue;
- CSV/bulk upload later.

### Featured stores

Possible benefits:

- storefront landing page;
- brand logo;
- top placement in store directory;
- promoted listings package.

## Risks

- Charging too early before supply liquidity.
- Paid boosts amplifying low-quality/fraud listings.
- Complex subscription logic delaying launch.
- Lack of analytics making pricing impossible to tune.
- Refund/support burden.

## Recommended sequence

1. Add boost/PRO CTAs without payment automation.
2. Track interest.
3. Manually process first payments via Clip links.
4. Add admin activation controls.
5. Automate Clip checkout only after demand is proven.
6. Add invoices/accounting workflow later.

## Follow-up implementation issues

Create issues for:

- pricing page draft;
- boost CTA on listing dashboard;
- PRO CTA on dashboard;
- admin manual promotion switch;
- analytics event tracking;
- Clip checkout integration;
- payment webhook verification;
- refund/support workflow.

## Launch gate

Do not launch paid traffic or paid seller products until:

- publish flow passes QA;
- listing moderation works;
- seller dashboard works;
- security review passes payment/auth/upload checks;
- analytics events are defined.
