# Mercasto authenticated UI visual QA evidence

- Generated: 2026-08-06T20:49:12.110Z
- Source commit: `4ca3e0e94cffe6801bba032fa7c34370a4b43e1b`
- Frontend: http://127.0.0.1:14173
- API: http://127.0.0.1:18000/api
- Screenshots: 9
- Automated failures: 0
- State: isolated credentialed environment; disposable PostgreSQL and provider-safe mocks; production data was not accessed or mutated.

| Viewport | Role | Screen | Final URL | HTTP | Overflow | Broken images | Page errors | Screenshot |
|---|---|---|---|---:|---:|---:|---:|---|
| desktop 1440×1000 | seller | publish | `http://127.0.0.1:14173/post` | 200 | 0px | 0 | 0 | [view](./desktop-publish.jpg) |
| desktop 1440×1000 | seller | my-ads | `http://127.0.0.1:14173/profile?tab=my_ads` | 200 | 0px | 0 | 0 | [view](./desktop-my-ads.jpg) |
| desktop 1440×1000 | admin | admin-dashboard | `http://127.0.0.1:14173/admin` | 200 | 0px | 0 | 0 | [view](./desktop-admin-dashboard.jpg) |
| tablet 1024×768 | seller | publish | `http://127.0.0.1:14173/post` | 200 | 0px | 0 | 0 | [view](./tablet-publish.jpg) |
| tablet 1024×768 | seller | my-ads | `http://127.0.0.1:14173/profile?tab=my_ads` | 200 | 0px | 0 | 0 | [view](./tablet-my-ads.jpg) |
| tablet 1024×768 | admin | admin-dashboard | `http://127.0.0.1:14173/admin` | 200 | 0px | 0 | 0 | [view](./tablet-admin-dashboard.jpg) |
| mobile 412×915 | seller | publish | `http://127.0.0.1:14173/post` | 200 | 0px | 0 | 0 | [view](./mobile-publish.jpg) |
| mobile 412×915 | seller | my-ads | `http://127.0.0.1:14173/profile?tab=my_ads` | 200 | 0px | 0 | 0 | [view](./mobile-my-ads.jpg) |
| mobile 412×915 | admin | admin-dashboard | `http://127.0.0.1:14173/admin` | 200 | 0px | 0 | 0 | [view](./mobile-admin-dashboard.jpg) |

## Scope

- Seller Publish form authenticated state.
- Seller My Ads dashboard authenticated state.
- Admin dashboard authenticated state.
- Desktop, tablet and mobile viewport coverage.
