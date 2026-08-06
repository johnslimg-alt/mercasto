# Mercasto production UI visual QA evidence

- Generated: 2026-08-06T20:20:53.736Z
- Production commit: `4eec7284a560d63436a072c37f0c3dcad5f1fdb0`
- Base URL: https://mercasto.com
- Screenshots: 24
- Automated failures: 0
- State: anonymous production browser; protected pages show the login gate without mutating production data.

| Viewport | Screen | Final URL | HTTP | Overflow | Broken images | Page errors | Screenshot |
|---|---|---|---:|---:|---:|---:|---|
| desktop 1440×1000 | home | `https://mercasto.com/` | 200 | 0px | 0 | 0 | [view](./desktop-home.jpg) |
| desktop 1440×1000 | listings | `https://mercasto.com/listings` | 200 | 0px | 0 | 0 | [view](./desktop-listings.jpg) |
| desktop 1440×1000 | pricing | `https://mercasto.com/tarifas` | 200 | 0px | 0 | 0 | [view](./desktop-pricing.jpg) |
| desktop 1440×1000 | login | `https://mercasto.com/login` | 200 | 0px | 0 | 0 | [view](./desktop-login.jpg) |
| desktop 1440×1000 | register | `https://mercasto.com/register` | 200 | 0px | 0 | 0 | [view](./desktop-register.jpg) |
| desktop 1440×1000 | publish | `https://mercasto.com/post` | 200 | 0px | 0 | 0 | [view](./desktop-publish.jpg) |
| desktop 1440×1000 | my-ads | `https://mercasto.com/profile?tab=my_ads` | 200 | 0px | 0 | 0 | [view](./desktop-my-ads.jpg) |
| desktop 1440×1000 | admin-login | `https://mercasto.com/admin` | 200 | 0px | 0 | 0 | [view](./desktop-admin-login.jpg) |
| tablet 1024×768 | home | `https://mercasto.com/` | 200 | 0px | 0 | 0 | [view](./tablet-home.jpg) |
| tablet 1024×768 | listings | `https://mercasto.com/listings` | 200 | 0px | 0 | 0 | [view](./tablet-listings.jpg) |
| tablet 1024×768 | pricing | `https://mercasto.com/tarifas` | 200 | 0px | 0 | 0 | [view](./tablet-pricing.jpg) |
| tablet 1024×768 | login | `https://mercasto.com/login` | 200 | 0px | 0 | 0 | [view](./tablet-login.jpg) |
| tablet 1024×768 | register | `https://mercasto.com/register` | 200 | 0px | 0 | 0 | [view](./tablet-register.jpg) |
| tablet 1024×768 | publish | `https://mercasto.com/post` | 200 | 0px | 0 | 0 | [view](./tablet-publish.jpg) |
| tablet 1024×768 | my-ads | `https://mercasto.com/profile?tab=my_ads` | 200 | 0px | 0 | 0 | [view](./tablet-my-ads.jpg) |
| tablet 1024×768 | admin-login | `https://mercasto.com/admin` | 200 | 0px | 0 | 0 | [view](./tablet-admin-login.jpg) |
| mobile 412×915 | home | `https://mercasto.com/` | 200 | 0px | 0 | 0 | [view](./mobile-home.jpg) |
| mobile 412×915 | listings | `https://mercasto.com/listings` | 200 | 0px | 0 | 0 | [view](./mobile-listings.jpg) |
| mobile 412×915 | pricing | `https://mercasto.com/tarifas` | 200 | 0px | 0 | 0 | [view](./mobile-pricing.jpg) |
| mobile 412×915 | login | `https://mercasto.com/login` | 200 | 0px | 0 | 0 | [view](./mobile-login.jpg) |
| mobile 412×915 | register | `https://mercasto.com/register` | 200 | 0px | 0 | 0 | [view](./mobile-register.jpg) |
| mobile 412×915 | publish | `https://mercasto.com/post` | 200 | 0px | 0 | 0 | [view](./mobile-publish.jpg) |
| mobile 412×915 | my-ads | `https://mercasto.com/profile?tab=my_ads` | 200 | 0px | 0 | 0 | [view](./mobile-my-ads.jpg) |
| mobile 412×915 | admin-login | `https://mercasto.com/admin` | 200 | 0px | 0 | 0 | [view](./mobile-admin-login.jpg) |

## Notes

- Login and registration are captured with their real production forms open.
- Publish, My Ads, and Admin login are captured in the anonymous authentication-gate state.
- Full authenticated publish/dashboard content still requires separate credentialed visual evidence.
