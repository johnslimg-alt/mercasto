# Mercasto Advertising Hub

## Goal

Provide one internal marketing control plane for paid acquisition, measurement, creative management, budgets and automation across Meta, TikTok, Google, X and Microsoft.

## UI

The first admin entry point is `/admin/marketing`.

Modules:

- Dashboard
- Connections
- Campaigns
- Creatives
- Audiences
- Pixels / Tracking
- Budgets
- A/B Tests
- Automations
- AI Analyst
- Reports

## Integration boundary

Platform SDKs and API payloads must not be used directly by UI components. Each provider implements the same adapter contract.

```text
AdvertisingHub
  -> Marketing API
      -> Campaign service
      -> Metrics service
      -> Attribution service
      -> Automation engine
      -> Provider adapters
          -> Meta
          -> TikTok
          -> Google Ads
          -> Merchant Center
          -> GA4 / GTM
          -> X Ads
          -> Microsoft Ads
```

## Canonical entities

- `marketing_connections`
- `marketing_accounts`
- `marketing_campaigns`
- `marketing_ad_groups`
- `marketing_ads`
- `marketing_creatives`
- `marketing_audiences`
- `marketing_daily_metrics`
- `marketing_conversion_events`
- `marketing_budget_rules`
- `marketing_automation_rules`
- `marketing_sync_runs`

Provider IDs are stored as external references. Mercasto IDs remain the canonical identifiers used by the UI and automation engine.

## Canonical metrics

- spend
- impressions
- reach
- clicks
- ctr
- cpc
- cpm
- registrations
- published_ads
- add_to_cart
- checkout_started
- purchases
- revenue
- cpa_registration
- cpa_publication
- roas

All money values must include currency. Reporting must never combine different currencies without an explicit conversion layer.

## Adapter contract

Each advertising provider should implement:

- connect / refresh credentials
- list accounts
- import campaigns
- create campaign
- create ad group
- create ad
- upload creative
- pause / resume
- update budget
- fetch metrics
- validate tracking
- normalize provider errors

Read and write capabilities are declared separately because some APIs or accounts may only support reporting.

## Security

- Credentials are encrypted server-side and never returned to the browser.
- OAuth states are signed and short-lived.
- Every write action is audited.
- Provider webhooks are signature-validated and idempotent.
- Budget changes require configurable limits.
- Automation rules support dry-run mode and rollback metadata.

## Delivery order

1. Foundation UI and canonical architecture.
2. Meta account connection and metrics import.
3. Registration and PostAd conversion dashboard.
4. Campaign pause/resume and budget updates.
5. TikTok reconnect and adapter.
6. Google Ads, Merchant Center, GA4 and GTM.
7. X Ads and Microsoft Ads.
8. Automated rules, A/B tests and AI recommendations.

## Current status

The foundation UI exists as an admin-only overlay at `/admin/marketing`. It intentionally displays placeholders until backend endpoints and provider adapters are implemented.
