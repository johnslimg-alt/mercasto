# Home V2 — SEO metadata audit (ТЗ §12)

Requirement at cutover: drop `noindex`, canonical → `https://mercasto.com/`, correct
title/description/OG/Twitter, structured data, **hreflang for 11 languages**, sitemap, and
either delete `/design-v2` or 301 it to `/` — with no two indexable homepages.

Method: loaded the V2 route and the legacy home that currently holds the production metadata,
and diffed every head tag. The comparison is the point: at cutover V2 inherits `/`, so it must
carry everything `/` carries today.

## 1. Metadata parity with the current production home — PASS

V2 already emits an identical head:

| Tag | legacy `/` | V2 `/design-v2` |
| --- | --- | --- |
| `title` | same | same |
| `meta[description]` | same | same |
| `link[canonical]` | same | same |
| `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name` | all present | all identical |
| `twitter:card`, `:title`, `:description`, `:image` | all present | all identical |
| `html lang` | `es-MX` | `es-MX` |
| JSON-LD | `FAQPage` + `ItemList` | `ItemList` + `FAQPage` |

The only difference is `robots`, and it is the intended one:

```
legacy /        index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1
v2 /design-v2   noindex,nofollow,noarchive
```

`/design-v2` is listed in `privatePathPatterns` (`src/App.jsx:1703`), which forces the
noindex branch at `:1714`. At cutover V2 renders at `/`, which is not private, so the
indexable value applies automatically — no code change needed for robots itself.

**Answer to the "two indexable homepages" requirement:** today only `/` is indexable, and
`/design-v2` is noindex, so the rule already holds. The cutover plan additionally turns
`/design-v2` into a redirect so the pair can never both be indexable.

## 2. Sitemap and robots — PASS

- `SitemapController` includes `$baseUrl . '/'` at `changefreq: daily`, `priority: 1.0`.
- `backend/public/robots.txt` declares `Sitemap: https://mercasto.com/sitemap.xml`.
- **`design-v2` appears nowhere in `backend/` or `index.html`** — the staging route does not
  leak into the sitemap, the shell, or any SEO asset.

## 3. hreflang cannot be added as a metadata change — the real finding

`hreflang` appears **nowhere in the project**:

```
index.html                0 matches
src/                      0 matches
backend/app, resources    0 matches
```

This is not an oversight that a tag can fix, because **the site has no per-language URLs**.
Language is switched through React context and persisted only client-side:

```js
// UIContext.jsx
const [lang, setLangRaw] = useState(() => normalizeLanguage(localStorage.getItem('lang') || ...));
localStorage.setItem('lang', lang);
// LanguageSwitcher.jsx:30
setLang(langCode);
```

Consequences:

1. All 11 languages are served from **one URL**. `hreflang` exists to point crawlers at the
   alternate URLs of the same content — with a single URL there is nothing to point at, so
   the annotation is not merely missing, it is currently unrepresentable.
2. Crawlers only ever see the **default (`es`) rendering**. The 11-language investment has no
   organic search footprint; the other ten languages exist only for users who switch manually.
3. Delivering §12's "hreflang for 11 languages" therefore requires **URL-level
   internationalization** — per-language paths or a language query parameter, plus matching
   canonical and `alternate` handling, sitemap entries, and the SEO shell — not a head-tag
   addition.

This is **not a V2 regression**: the legacy home has exactly the same architecture. It is
recorded here because §12 lists hreflang as a cutover item, and the owner should decide
whether to (a) accept a single-URL, Spanish-indexed site for launch, or (b) scope URL-level
i18n as a separate project. Option (b) is a routing/SEO architecture change and should not
block the homepage cutover.

## 4. Remaining §12 items

| Item | Status |
| --- | --- |
| drop `noindex` | automatic at cutover — `/` is not in `privatePathPatterns` |
| canonical → `https://mercasto.com/` | already resolves to the site root; verify on production after the switch |
| title / description / OG / Twitter | parity confirmed |
| structured data | parity confirmed (`FAQPage`, `ItemList`) |
| sitemap | includes `/`; `/design-v2` absent |
| `/design-v2` → 301 | planned in `docs/home-v2-cutover-plan.md` §4 |
| hreflang for 11 languages | **blocked on URL-level i18n** — see §3 |
| AI/GEO metadata | not assessed here; the repo has separate GEO contract scripts that pass |
