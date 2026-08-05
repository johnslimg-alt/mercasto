# Mercasto Lighthouse baseline

**Audit date:** 2026-08-04 UTC
**Production commit audited:** `6bc3d7864690b634e84f05ae804d7b91b1f18710`
**Tool:** Lighthouse 13.0.1 with headless Chromium
**Modes:** Lighthouse mobile throttling and desktop preset

This report replaces the earlier May estimate with a reproducible audit of the live production routes required by launch gate #271.

## Score matrix

| Route | Mode | Performance | Accessibility | Best practices | SEO | FCP | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | Desktop | 92 | 97 | 92 | 100 | 0.45s | 1.35s | 0.014 | 147ms |
| `/` | Mobile | 46 | 100 | 92 | 100 | 3.74s | 6.77s | 0.000 | 910ms |
| `/listings` | Desktop | 98 | 96 | 92 | 66 | 0.48s | 1.04s | 0.004 | 0ms |
| `/listings` | Mobile | 72 | 96 | 92 | 66 | 1.86s | 4.52s | 0.010 | 438ms |
| `/ads/6336` | Desktop | 95 | 94 | 92 | 92 | 0.46s | 1.52s | 0.009 | 0ms |
| `/ads/6336` | Mobile | 67 | 94 | 92 | 92 | 1.81s | 6.45s | 0.010 | 358ms |
| `/post` | Desktop | 73 | 92 | 92 | 61 | 0.46s | 1.60s | 0.509 | 0ms |
| `/post` | Mobile | 33 | 92 | 92 | 61 | 2.17s | 5.42s | 0.830 | 872ms |
| `/profile` | Desktop | 70 | 92 | 92 | 92 | 0.52s | 1.59s | 0.504 | 115ms |
| `/profile` | Mobile | 37 | 92 | 92 | 92 | 0.85s | 5.06s | 0.829 | 877ms |

## Verified findings

- No Lighthouse audit crashed on any of the ten runs.
- Desktop public routes are healthy; the homepage, catalog and listing detail score 92–98 for performance.
- Mobile main-thread work remains the largest public performance constraint: 5.6s on home, 2.7s on catalog and 3.2s on listing detail.
- Anonymous `/post` and `/profile` audits measure the authentication transition. That transition creates the high CLS values around 0.83 and needs a stable reserved layout or route-level auth shell.
- The catalog SEO score was reduced by homepage canonical/Open Graph metadata in the initial HTML. The SEO shell change in this launch branch corrects that server response.
- Lighthouse reported two browser console errors on every route: Content Security Policy blocked the configured TikTok and Meta pixel scripts. The CSP allowlist change in this branch addresses those exact official script origins.
- The initial HTML previously fetched featured-home ads and preloaded the home LCP image on every route. The branch now limits that work to `/`.

## Bundle evidence

The 2026-08-04 production build completed successfully. Current notable gzip sizes include:

- main application bundle: approximately 128 KiB gzip;
- React vendor bundle: approximately 56 KiB gzip;
- dashboard charts: approximately 105 KiB gzip and lazy-loaded;
- user dashboard: approximately 31 KiB gzip and lazy-loaded;
- listing detail: approximately 12 KiB gzip and lazy-loaded;
- publish screen: approximately 9 KiB gzip and lazy-loaded.

## Required follow-up

The baseline itself is complete. Mobile optimization remains product work rather than hidden launch evidence:

1. reduce main-thread work and unused JavaScript on the homepage;
2. stabilize the anonymous auth transition for `/post` and `/profile` to remove large CLS;
3. rerun this matrix after the SEO shell/CSP deployment;
4. keep the full raw Lighthouse JSON as CI or operator artifacts rather than committing large generated files.

## Reproduction

For each route, run Lighthouse with categories `performance,accessibility,best-practices,seo`, once with default mobile throttling and once with `--preset=desktop`. The audited routes are `/`, `/listings`, `/ads/6336`, `/post`, and `/profile`.
