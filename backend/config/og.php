<?php

/**
 * Social share-preview (Open Graph) compositing.
 *
 * Facebook, WhatsApp, X and LinkedIn crop every og:image to roughly 1.905:1
 * (1200x630) before rendering a large link preview. Sending the raw listing
 * photo therefore shows only a fraction of the product: a 1200x1800 portrait
 * loses 65% of its height. These previews are composited instead - the stored
 * upload is never modified, padded or cropped.
 *
 * Geometry is deliberately kept inside the same 1200x630 canvas, navy base and
 * lime rail used by the branded default card (design/og/og-default-1200x630.svg)
 * so composited and fallback cards render as siblings in a feed.
 */
return [

    'preview' => [
        'width' => 1200,
        'height' => 630,
        'quality' => 82,

        // Branded frame. The photo never bleeds to the canvas edge, so the
        // ~1-9px horizontal trim that X/LinkedIn apply to a 1200x630 card can
        // never reach the product.
        'top_rail' => 8,
        'bottom_bar' => 64,
        'side_padding' => 40,
        'vertical_padding' => 24,

        // Backdrop: a heavily blurred, darkened "cover" copy of the same photo,
        // inserted translucently over the navy base. It fills the letterbox area
        // with content from the listing instead of flat bars, without showing a
        // misleading crop - the sharp, fully visible copy sits on top.
        //
        // The blur is applied to a 120x63 proxy and then upscaled. Intervention's
        // GD driver runs one full-size gaussian pass per blur level, so blurring
        // at 1200x630 costs ~2.4s; the proxy path costs ~50ms for the same look.
        'backdrop_proxy_width' => 120,
        'backdrop_blur' => 8,
        'backdrop_brightness' => -18,
        'backdrop_opacity' => 0.45,

        'colors' => [
            'base' => '#0F172A',
            'rail' => '#84CC16',
            'keyline' => '#334155',
            'bar' => '#0F172A',
            'text' => '#F8FAFC',
            'muted' => '#94A3B8',
        ],

        'wordmark' => 'mercasto',
        'tagline' => 'Clasificados en México',
        'wordmark_size' => 30,
        'tagline_size' => 20,

        // Null resolves to the DejaVu font already shipped with dompdf. Text is
        // skipped (not fatal) when no readable font is available.
        'font' => null,

        // Optional path to a statically deployed branded card, used for listings
        // with no usable photo. Absolute, or relative to the BACKEND document
        // root (public_path()). When null the service probes public_path() for
        // og-default-1200x630.jpg then .png.
        //
        // Deployment note: PR #1143 adds its card to the *frontend* public/
        // directory, which is baked into the nginx image and is not on the
        // backend filesystem, so public_path() does not find it in production.
        // The service then composes its own 1200x630 card instead. An operator
        // who wants the designed artwork served by the backend can drop it into
        // backend/public/ or point this at it - nothing is duplicated for this.
        'static_card' => env('OG_STATIC_CARD'),
    ],

    'cache' => [
        'disk' => 'local',
        'path' => 'og-previews',

        // Bounded cache. Previews are generated on demand and pruned on write
        // plus by `php artisan og:prune-previews`; the directory never grows
        // without limit.
        'max_files' => 1200,
        'ttl_days' => 45,
    ],

    // Served as og:image. Platforms cache the first fetch for days, so a long
    // s-maxage is safe; the ETag still lets a revalidating crawler pick up a
    // re-photographed listing.
    'cache_control' => 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
];
