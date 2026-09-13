# Default Open Graph card (1200x630)

The share card served at `/share/ads/{id}` falls back to a branded image when a
listing has no usable photo. It used to fall back to `public/icon-512x512.png`
(a **512x512** square app icon), which is below the large-preview minimum, so
Facebook / WhatsApp / X / LinkedIn rendered a small or cropped card.

This directory holds the replacement, its source of truth, and the measurements
behind its acceptance criteria.

## Files

| Path | Role |
|---|---|
| `design/og/og-default-1200x630.svg` | **Source of truth.** Edit this. |
| `public/og-default-1200x630.jpg` | Rasterised, preferred `og:image`. **54,145 bytes.** |
| `public/og-default-1200x630.png` | Same artwork, lossless fallback. **97,915 bytes.** |
| `scripts/rasterize-og-default.mjs` | Regenerates both raster assets from the SVG. |
| `scripts/check-og-default-asset.mjs` | Verifies dimensions/format/size budget. |
| `design/og/evidence/` | Feed-legibility and crop proof images. |

## How to regenerate

```bash
node scripts/rasterize-og-default.mjs     # SVG -> both raster assets
node scripts/check-og-default-asset.mjs   # verify dimensions + budget
```

No new dependencies. The rasteriser prefers **`rsvg-convert`** (librsvg, present
on this box as 2.58.0) and falls back to **Playwright Chromium**, which is
already a devDependency of this repo, so a clean checkout can regenerate the
assets after `npm ci`. JPEG encoding goes through `python3` + PIL, because
librsvg is usually built without a JPEG encoder; if PIL is missing the PNG is
still written and `og:image` can point at the PNG instead.

Rasterisation is **deterministic**: re-running `rsvg-convert` on the committed
SVG reproduces a byte-identical PNG (verified, same sha256 across runs).

## Acceptance criteria (all measured)

| Criterion | Requirement | Measured |
|---|---|---|
| Dimensions | exactly 1200x630 | **1200x630** (PNG IHDR + JPEG SOF) |
| Aspect ratio | 1.905:1 (1.91:1 nominal) | **1.905** |
| Format | JPEG preferred, PNG acceptable | both provided |
| Opacity | must be opaque | PNG `colorType=2` (truecolour, no alpha) |
| File size | <= 200 KB each | **JPG 54,145 B; PNG 97,915 B** |
| Contrast, white text on card | >= 4.5:1 | **16.07:1** worst case |
| Contrast, lime accent on card | >= 4.5:1 | **8.13:1** worst case |
| Contrast, pill label | >= 4.5:1 | **12.02:1** (light text on `#1F2937`) |
| Safe margin | no load-bearing content outside x=96..1104 | verified, see evidence |
| Legibility at 300px wide | wordmark + headline readable | verified, see evidence |

Contrast figures are computed from the **rendered pixels** of the committed PNG
(sampled across the empty background band), not from the intended hex values, so
they account for the lime/teal radial washes.

### Why a 200 KB budget

The card is fetched by crawlers on every share unfurl, sometimes on a cold
cache, and a slow response silently fails the preview. This budget is not tight
for the sake of it:

| Asset | Bytes |
|---|---|
| `icon-512x512.png` (what it replaces) | 128,924 |
| real ad photo `...30454739-1200.jpg` (1200x1800) | 237,540 |
| real ad photo `...10313690.jpg` (1600x1067) | 306,873 |
| **`og-default-1200x630.jpg` (this card)** | **54,145** |

The new card is **2.4x smaller than the icon it replaces** and 4-6x smaller than
a typical real photo, while being 2.3x larger in pixel width. Platforms allow up
to 5 MB, so the budget is generous; the point is to keep the unfurl cheap.

## When this card is used vs the real listing photo

The rule, in priority order:

1. **Real listing photo wins**, when the ad has at least one image that resolves
   to a fetchable file. This is the common case - measured on production, **all
   16 sampled share cards served a real photo** and **0 of 80 sampled active ads
   lacked an image**.
2. **This card is used** when `resolveImage()` in
   `backend/app/Http/Controllers/ShareAdController.php` finds no candidate at
   all (no `image_url`, no `image`), i.e. every fallback path is exhausted.
3. **The app icon is never used as `og:image` again.** A square icon can never
   satisfy the large-preview contract.

If you later add a "photo failed to load" state, treat a 404 from the resolved
photo URL as case 2 rather than pointing `og:image` at a dead link - a broken
`og:image` renders no preview at all, which is worse than a branded one.

## What is NOT solved by this card (read before closing the ticket)

The fallback is **rare, but the real photo is frequently the wrong shape.**
Measured aspect ratios of the only two photos in live use:

| Photo | Ratio | vs 1.905 | Consequence |
|---|---|---|---|
| `...30454739-1200.jpg` | 1200x1800 = **0.667** | way off | platforms centre-crop to **35% of the image visible** |
| `...10313690.jpg` | 1600x1067 = **1.500** | off | ~**79% visible** |

So the dominant preview defect today is **crop, not the fallback**: a portrait
listing photo loses ~65% of its pixels in the feed. This card does not fix that.
The two candidate fixes, in order of preference:

- **Preferred: composite at share time.** The repo already has what is needed -
  `intervention/image ^4.0` is in `backend/composer.json` and PHP 8.3 has `gd`,
  so the share controller can render the 1200x630 branded frame with the listing
  photo contained inside it. That gives every share a correct aspect ratio, a
  truthful `og:image:width/height`, and consistent branding. **Recommended
  follow-up ticket.**
- **Cheaper: declare no size and accept the crop.** Keep serving the raw photo
  but stop emitting `og:image:width/height` for photos whose ratio is not ~1.905,
  so platforms fall back to their own heuristics instead of trusting a size that
  does not describe the crop.

**Do not** blindly pad or crop the stored listing photo on upload: the stored
asset is also used by the ad detail page, where the full portrait image is
correct.

### `og:image:width/height` must stay truthful

Whatever is served as `og:image`, `og:image:width` and `og:image:height` must
describe **that exact file**. In particular, do **not** declare `1200x630` while
serving a 1200x1800 photo - that is worse than declaring nothing, because
platforms will trust the ratio and crop to it. This card makes the declaration
trivially true because its real size is exactly 1200x630.

> Note: this branch is built on `origin/main`, where `ShareAdController` does
> **not** yet emit `og:image:width/height` (verified - no match anywhere in the
> repo). PR #1138 is expected to add it. Land this card first, then have #1138
> read the dimensions from the file it actually serves; the helper for that is
> already applied in the wiring section below.

## Wiring (applied on this branch)

`ShareAdController::DEFAULT_SHARE_IMAGE` is the single source of truth for the
served URL. `resolveImage()` returns it when a listing has no usable photo, and
`resolveImageSize()` returns its declared size so `og:image:width/height` are
emitted for the fallback as well.

The size is a **constant**, not a runtime `getimagesize()`, because the card ships
with the static frontend (the Dockerfile copies `public/` to the nginx document
root) and is therefore not present in the backend container. It is not a guess:
`test_declared_default_card_size_matches_the_committed_asset` measures the
committed file and fails if the constants drift.

`resolveImageSize()` matches paths against an **allowlist**, not a pattern. That
matters because production returns the SPA shell with **HTTP 200** for unknown
root paths, so a naive "does this URL resolve" check would happily advertise a
preview size for an HTML document. Covered by
`test_share_card_does_not_advertise_dimensions_for_other_public_assets`.

### Sequencing

This branch is stacked on **#1138** (which adds the `og:image:width/height`
emission). **Merge #1138 first, then rebase this onto it.** Both PRs touch
`ShareAdController.php` and `ShareAdCardTest.php`.

`scripts/share-og-smoke.sh` carries a **transitional exemption**: the `>=600x315`
assertion is fatal for every undersized image *except* the legacy
`icon-512x512.png` that production still serves until this deploys. That case
reports a loud WARN instead, so merging does not turn `smoke:all` / `gate:prod`
red for everyone. **Tighten it by deleting that commented block once the branded
card is deployed** — after that, every undersized preview must fail.

## Changing the artwork

The card is deliberately minimal because it is normally seen ~300px wide. If you
edit the SVG:

1. Keep the canvas at exactly `1200x630`.
2. Keep all load-bearing content inside `x=96..1104`, `y=40..590` (the tightest
   platform crop is LinkedIn at 1200x627).
3. Keep the base **opaque**. Feeds composite onto unknown backgrounds.
4. Re-check contrast against the **rendered** pixels, not the hex values, if you
   change the washes.
5. Re-run both scripts, and re-run `npm run smoke:share-og` against a deployment
   once wired.

`npm run smoke:share-og` now also asserts that the served `og:image` is at least
600x315 (the cross-platform large-preview minimum) and warns when its ratio is
not ~1.905. Verified behaviour of that check:

| Served image | Result |
|---|---|
| current `icon-512x512.png` | **FAIL** - "512x512 is below the 600x315 large-preview minimum" |
| a real portrait listing photo | WARN - "ratio 0.667 is not ~1.905; platforms will centre-crop it" |
| `og-default-1200x630.jpg` | PASS - 1200x630 (ratio 1.905) |

## Open questions

- **Serve from `public/` or `storage/`?** `public/` matches the existing
  `icon-512x512.png` precedent and needs no storage symlink. If the CDN in front
  of `mercasto.com` only caches certain path prefixes, this should be confirmed
  before wiring.
- **Platform cache.** Facebook/X cache unfurls aggressively. After wiring,
  re-scrape via each platform's debugger, or the old icon may persist.
- **Spanish-first wording.** The card says "Compra y vende cerca de ti" and
  "Clasificados en todo México" - correct for the primary market. The share
  controller already localises title/description, so a per-locale card is
  possible later; it is not worth 11 assets today.
