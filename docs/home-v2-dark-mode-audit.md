# Home V2 — dark-mode surface sweep (ТЗ §9)

Requirement: no light patches or pure-white surfaces inside dark mode, across cards, filters,
popovers, category buttons, promo, pricing, footer, auth, dialogs, shadows and border contrast.

Method: production build loaded with the dark theme active, then every element with a
background was scanned for a light luminance (relative luminance > 0.5). Elements below
20 000 px² are ignored, because small light elements are intentional (lime buttons, badges,
icons, the favourite pill); the threshold targets the "big white patch" failure mode.
Routes: V2 home, catalog, ad detail — desktop 1440 and mobile 390.

## 1. Result

| Route | Viewport | Large light surfaces |
| --- | --- | --- |
| `/design-v2` | desktop | **0** |
| `/design-v2` | mobile | **0** |
| `/listings` | desktop | 1 — Leaflet map canvas |
| `/listings` | mobile | 0 |
| `/ads/6376` | desktop | 1 — Leaflet map canvas |
| `/ads/6376` | mobile | 1 — Leaflet map canvas |

The V2 home is clean on both breakpoints. The design-layer primitives were additionally
confirmed by computed style earlier: `.mc-chip` resolves to `#0F172A` on `#CBD5E1` text,
`.mc-panel` to a dark surface with a dark border, `.mc-price` to white and `.mc-price-unit` /
`.mc-eyebrow` to `#94A3B8`.

## 2. The only light surfaces are raster map tiles — and V2 avoids them

All three hits are the same element: `div.h-full.w-full` with `background: rgb(221,221,221)`
(relative luminance 0.723), identified by the Leaflet attribution text. That is the OpenStreetMap
**raster tile canvas**, which is light by nature.

`src/leaflet-dark-overrides.css` is only 24 lines and darkens Leaflet's *controls* — zoom
buttons and the attribution bar — but never the tile pane:

```css
html.dark .leaflet-control-zoom a { background-color: #1E293B; ... }
html.dark .leaflet-control-attribution { background: rgba(15, 23, 42, 0.88); ... }
```

So in dark mode the map presents **dark controls on a light canvas**. That is a pre-existing
shared-component gap, not a V2 regression, and it affects the catalog and ad detail equally.

**The V2 home is not exposed to it.** A focused check scrolled the V2 real-estate map card into
view and waited 6 s:

```
leafletLoaded: false, tileCount: 0, placeholderVisible: true
```

V2 defers the map behind `v2-map-placeholder`; Leaflet is never fetched on the home route. This
matches the earlier chunk audit, where `/design-v2` requested no Map or Leaflet chunk while the
legacy home did. So V2 both performs better here and cannot show a light map in dark mode until
the user opens it.

## 3. Recommendations

1. If a dark map is wanted, apply a filter to `.leaflet-tile-pane` in dark mode (the common
   approach for raster tiles) or switch to a dark tile provider. This is a shared-component
   change and would improve the catalog and ad detail, not just the home.
2. Keep V2's deferred map behaviour — it is the reason the home has no light surface and no
   map bundle on first load.
3. Add this sweep to the visual gates so a future white patch is caught automatically rather
   than by eye; the threshold approach found the real offender here with no false positives.

## 4. Not covered

- Modal and popover states (pricing modal, auth dialog, language menu open, mobile sheets) were
  not swept with the same scan — they require interaction before the surfaces exist. The
  language menu's dark rendering was exercised separately in the §4 audit.
- Shadow and border contrast were checked only via the computed colours of the design-layer
  primitives, not measured as contrast ratios for every border in the page.
