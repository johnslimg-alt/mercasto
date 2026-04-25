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

## Suggested first pricing tests in MXN

| Product | Suggested price | Value proposition |
|---|---:|---|
| 7-day listing boost | 49-99 MXN | More visibility in category/search |
| 30-day listing boost | 149-249 MXN | Better ranking for serious sellers |
| PRO seller monthly | 199-399 MXN | More listings, seller badge, dashboard |
| Featured store monthly | 499-999 MXN | Storefront, promoted listings, trust badge |
| Autos featured listing | 199-499 MXN | Higher-intent category visibility |
| Services verified provider | 199-499 MXN/month | Trust badge and lead visibility |

These are starting hypotheses, not final prices.

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

## Unit economics checklist

- [ ] Cost of infrastructure per month.
- [ ] Cost of AI API/local GPU per listing if used.
- [ ] Cost of moderation per listing.
- [ ] Clip fees and payout timing.
- [ ] Refund/dispute risk.
- [ ] Support workload per paid seller.
- [ ] Break-even paid sellers per month.

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
