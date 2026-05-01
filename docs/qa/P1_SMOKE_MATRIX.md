# Mercasto P1 Smoke Matrix

## Purpose
Repeatable production smoke checklist for Mercasto after deploy, rollback, security, payment, or infrastructure changes.

## Required checks
- Homepage opens on https://mercasto.com/ without blank screen.
- Public UI does not show MVP/internal payment provider wording.
- API endpoints /api/auth/providers, /api/categories, and /api/ads?page=1 respond safely.
- Login, account, listings, photos, and payment flows must not expose raw errors.
- Payments must not activate paid features from success/fail redirect alone.
- Ownership checks must block access to other users listings/photos/payments.
- Own PHP code must pass lint excluding vendor/node_modules/cache/worktrees.

## Pass definition
P1 passes only when public site, auth, seller flows, photos, payments, API, and security baseline checks pass.
