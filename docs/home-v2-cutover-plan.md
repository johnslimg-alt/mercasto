# Home V2 cutover plan — `/design-v2` → `/`

Status: **PREPARED, NOT EXECUTED.** Production cutover requires the owner's explicit
visual approval. Nothing in this document has been run against `mercasto.com`.

Branch under test: `design/standalone-integration-20260910`
Hybrid (V2 + refreshed card/catalog): `design/hybrid-card-catalog`
Related gates: `scripts/home-v2-parity-audit.mjs`, `docs/home-v2-parity-audit.md`

---

## 1. Entry criteria — all must hold at the same time

| Gate | Command | Required |
| --- | --- | --- |
| Parity audit | `node scripts/home-v2-parity-audit.mjs` | exit 0 |
| i18n 11/11 | `npm run i18n:audit` | pass |
| Contract tests | `node --test tests/*.test.mjs` | 0 fail |
| Lint | `npm run lint:ci` | 0 errors |
| Build | `npm run build` | exit 0 |
| E2E on a production build | see §3 | 0 fail |
| Accessibility | axe on V2 light/dark, menu/filters/pricing/auth open | 0 violations |
| Security | `npm run check:static-safety`, `npm run smoke:security`, `npm run smoke:session-security`, `npm run smoke:route-audit` | pass |
| Launch tracker | `npm run launch:status` | no new blockers |
| **Owner visual approval** | — | **required, blocking** |

Current parity reading on this branch: **14 → 0 MUST MIGRATE**, 0 testid breaks,
0 i18n gaps. Remaining prop deltas (`form`, `getImageUrl`, `renderSkeletonCard`,
`viewedAd`) are non-blocking: `form` is unused in the legacy screen (eslint
confirms), and the others reach V2 through `renderAdCard`/shared image helpers.

---

## 2. Pre-deploy — rollback preparation (do first, in this order)

```bash
# 1. Record the exact rollback point BEFORE anything changes.
cd /var/www/mercasto
git fetch origin
ROLLBACK_SHA=$(git rev-parse origin/main)
echo "ROLLBACK_SHA=$ROLLBACK_SHA" | tee /root/home-v2-rollback-sha.txt

# 2. Fresh database backup, then prove it is fresh.
npm run smoke:backup-freshness

# 3. Media backup contract.
bash scripts/media-offsite-backup-smoke.sh
bash scripts/offsite-backup-smoke.sh

# 4. Build and stash the CURRENT (legacy) frontend artifact, so a rollback can
#    restore bytes instead of rebuilding from a moving tree.
npm run build
tar -czf "/root/rollback-frontend-$(date -u +%Y%m%dT%H%M%SZ).tgz" dist

# 5. Compose/network sanity before touching anything.
npm run check:compose
python3 scripts/check-deploy-network-safety.py
```

Do not continue if any command above fails.

---

## 3. E2E that must be green against a **production build** (not the dev server)

Some specs depend on hashed chunk names and on `/api` being proxied, so they can
only pass against a build. Serve it locally and point Playwright at it:

```bash
npm run build
npx vite preview --port 5203 --strictPort --host 127.0.0.1 &
BASE_URL=http://127.0.0.1:5203 npx playwright test \
  tests/e2e/ad-card-favorite-tap-target.spec.js \
  tests/e2e/catalog-ux-redesign.spec.js \
  tests/e2e/catalog-map-responsive.spec.js \
  tests/e2e/catalog-filter-state.spec.js \
  tests/e2e/home-categories.spec.js \
  tests/e2e/header-geometry-scrollbar.spec.js \
  tests/e2e/mobile-shell-touch-targets.spec.js \
  tests/e2e/sticky-header-offsets.spec.js \
  tests/e2e/ad-detail-localization.spec.js \
  tests/e2e/ad-detail-critical-path.spec.js
```

Known non-regressions, so they are not mistaken for cutover failures:
- `public-smoke.spec.js` legal routes `/reembolsos` and `/moderacion` are absent
  from `src/App.jsx` in this revision (verified against the pristine base commit).
- `public-smoke.spec.js` "sensitive files" and the `/api/ads` cases need the nginx
  proxy and deny rules; they cannot pass against a bare Vite server.

---

## 4. Cutover edits — exact locations

All in `src/App.jsx` unless noted.

1. **Serve V2 at `/`** — line ~4126:
   ```js
   const renderHomeRoute = () => (hasCatalogIntent ? renderCatalogScreen() : renderHomeScreen());
   ```
   Swap `renderHomeScreen()` → `renderHomeV2Screen()`.
   Keep `renderHomeScreen` and `HomeScreen.jsx` in the tree — do not delete them.

2. **`/design-v2` becomes a 301-style redirect** — line ~4275. Replace
   `<Route path="/design-v2" element={renderHomeV2Screen()} />`
   with `<Route path="/design-v2" element={<Navigate to="/" replace />} />`
   so two homepages never coexist.

3. **Header options are keyed to the old path — this is the trap.** Lines ~4215-4216:
   ```js
   hideCategoryBar={location.pathname === '/design-v2'}
   useCustomLanguageMenu={location.pathname === '/design-v2'}
   ```
   Once V2 lives at `/`, both become `false` and the header silently reverts to the
   legacy category bar and the system `<select>` language menu — contradicting the
   V2 design and ТЗ §4. Re-key both conditions to the home route.

4. **SEO flip.** `/design-v2` is currently listed in `privatePathPatterns` (line
   ~1703), which is what forces `noindex,nofollow,noarchive` (line ~1714). After
   cutover:
   - `/` must resolve to `index,follow,max-image-preview:large,…` — it does
     automatically once V2 renders at `/` and no filter params are present.
   - Confirm `canonical` for the home route is `https://mercasto.com/`.
   - Keep `/design-v2` out of any sitemap.
   - Re-run the sitemap cron (`scripts/update-sitemaps.sh` on the host) or wait for
     its 03:00 run, then verify `robots.txt` and `sitemap.xml` still resolve.

5. **Keep a rollback flag.** Wrap the swap in a single named constant so a revert
   is one line rather than a full redeploy of reverted code, e.g.
   `const HOME_RENDERER = 'v2';  // 'v2' | 'legacy'`. Keep it for at least one
   release after cutover.

---

## 5. Post-deploy verification (production)

```bash
BASE_URL=https://mercasto.com npm run smoke:prod
BASE_URL=https://mercasto.com npm run smoke:routes
BASE_URL=https://mercasto.com npm run smoke:seo
BASE_URL=https://mercasto.com npm run smoke:cache-headers
npm run smoke:security
```

Plus, by hand on production:
- `/` renders V2; `/design-v2` redirects to `/`.
- `view-source`/devtools: `robots` is `index,follow…`, canonical is `https://mercasto.com/`.
- Search, filters, category navigation, pricing modal, publish CTA, saved search,
  favourites and card → detail all work while logged out and logged in.
- 11 languages including AR RTL; light and dark.
- 1920 / 1440 / 1280 / 1024 / 768 / 430 / 390 / 360 / 320, plus 125/150/200 % zoom.

---

## 6. Rollback

Trigger if any P0 regression appears (homepage 5xx, search or publish broken,
payment entry broken, layout collapse, SEO metadata wrong).

```bash
# Prefer the one-line flag: set HOME_RENDERER = 'legacy', rebuild, redeploy.
# Otherwise revert the single cutover commit:
git revert <cutover-commit-sha>
npm run build && <deploy>

# Restore the archived legacy artifact if a rebuild is not desirable:
tar -xzf /root/rollback-frontend-<timestamp>.tgz -C <frontend-root>

# Database is untouched by the frontend cutover, so no DB rollback is expected.
# If one is ever needed, restore from the backup taken in §2 and say so explicitly.
```

After rollback, re-run §5 and record the incident.

---

## 7. Monitoring — 24 to 48 hours

Compare legacy homepage vs Home V2 on: search usage, card CTR, publish
conversion, signup conversion, pricing views, contact-seller clicks, bounce,
scroll depth. V2 traffic is already tagged `source=design_v2`.

Watch error rate and Core Web Vitals (LCP, CLS, INP) for regressions against the
pre-cutover baseline.

---

## 8. Explicitly out of scope for this document

- Merging to `main` — separate review + CI.
- Owner/business sign-off on legal texts, business entity, tax and payment terms
  (`REQUIRE_LEGAL_READY=1 npm run smoke:legal-readiness` must go green first).
- Infrastructure launch blockers tracked separately: DNSSEC stabilisation,
  CDN/WAF decision, staged Ubuntu maintenance, provider-side credential
  revocation evidence, full-site UX audit.
