# Home V2 — search / URL contract verification (ТЗ §5)

Requirement: the search URL must be shareable and must restore after a reload.
No filter may live only in React state when the user is meant to forward it.

Method: production build served locally, real public API, Playwright.

## Result: PASS, with one pre-cutover-only caveat

### Search lands in a shareable URL

```
start        /design-v2
after search /?search=Nissan
after reload /?search=Nissan     (unchanged)
```

The URL builder (`buildHomeFilterPath`, `src/App.jsx:856`) covers the full contract:
`search`, `category`, `subcategory`, `location`, `state`, `city`, `min_price`,
`max_price`, `condition`, `lat`/`lng`/`radius` and dynamic attribute filters. Empty values
are omitted, so unfiltered URLs stay clean.

### Filtered results restore after reload

`/?search=Nissan` reloaded → 16 cards, same as before the reload. The same holds for
`/listings?search=Nissan&min_price=1000` → 16 cards with both params preserved.

### SEO on filtered URLs is correct

| Check | Result |
| --- | --- |
| `robots` on `/?search=Nissan` | `noindex,follow,max-image-preview:large` |
| `canonical` | site root, not the filtered URL |

This matches the production behaviour already asserted elsewhere: a filtered home URL is
crawlable-but-not-indexed, and does not compete with the indexable homepage.

## Caveat — the search box is empty on `/design-v2`, and that is expected

Opening `?search=Nissan` directly shows filtered results, but the search inputs are empty.
Measured across the three routes:

| Route | In the hydration allow-list | Header input | Cards |
| --- | --- | --- | --- |
| `/` | yes | `"Nissan"` | 16 |
| `/listings` | yes | `"Nissan"` | 16 |
| `/design-v2` | **no** | `""` | 16 |

Cause: the URL→state hydrator is gated to the production paths —
`if (!['/', '/listings'].includes(pathname)) return false;` at `src/App.jsx:1290`. The
listing results are filtered through a separate path, which is why the cards are correct
while the inputs are not.

**This is not a defect to fix.** It disappears at cutover, because V2 will render at `/`,
which is already in the allow-list. It is recorded here so it is not mistaken for a search
regression during the `/design-v2` review, and it is added to the cutover verification list:
after the switch, confirm the search box shows the query from a shared URL.

One consequence worth remembering: the hydrator is path-based, so **any** staging path that
serves the home screen outside `/` and `/listings` will not hydrate its inputs.
