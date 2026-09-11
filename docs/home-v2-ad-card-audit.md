# Home V2 — ad-card audit (ТЗ §6)

Requirement: audit the listing card across price, currency, city, date, seller, verified,
favourite, promoted, photo count, responsive image, lazy loading, placeholder, long titles,
multi-language titles and unavailable/deleted listings — and make sure clicking a card cannot
conflict with the favourite control.

Method: the live catalogue is 100% catalog-filler, so the card was exercised with crafted API
payloads covering the edge cases the real data does not contain. A first pass silently skipped
three cases because the home renders only 4 featured + 12 trending cards; those three were
re-run in isolation, and that limitation is recorded here rather than glossed over.

## 1. Verified working

| Attribute | Result |
| --- | --- |
| price + currency | renders `$12,345.67` with the `MXN` unit; `$0` renders as `$0` |
| price drop | `price: 500, old_price: 900` shows the current `$500` |
| promoted badges | all four states render — *Destacados*, *Urgente*, *Resaltado*, *PRO* |
| favourite | present on every card, measured **48 px** in all cases |
| photo count | badge shows `5` for a five-image listing |
| missing image | falls back to `/placeholder-ad.svg` |
| lazy loading | every card image carries `loading="lazy"` (first cards `eager` by priority) |
| long title | clamped to 2 lines, no horizontal overflow |
| unbreakable long word | clamped, no overflow |
| multi-language title | renders the active locale (`{es,en}` → Spanish under `es-MX`) |
| click vs favourite | covered by `ad-card-favourite-tap-target` — all three cases pass |

Result: **0 problems** in the automated pass (horizontal overflow, missing favourite,
sub-48 px target, missing price unit, odd loading attribute were all asserted).

## 2. Unavailable listings are handled upstream, not in the card — and that is correct

Crafted `status: 'deleted'` and `status: 'expired'` rows render as ordinary cards with no
visual distinction. That looks alarming but is not a defect, because the guarantee lives
elsewhere and holds:

- the public ads index filters `status = 'active'` (`AdController.php:285,290`);
- the ad detail route rejects non-active rows (`AdController.php:473`);
- the live production API returns **16/16 `active`**, with 0 expired.

So the card never receives such a row in practice, and a stale deep link is handled by the
detail route. Adding an "unavailable" card state would only matter if the API guarantee were
ever relaxed — worth a comment in the card, not a code change today.

## 3. Two attributes §6 lists that the card does not surface

The card shows price, title, location, condition, recency, view count, promoted badge and
photo count. It does **not** show:

- **seller name** — `ad.user.name` is never rendered;
- **seller verification** — `is_verified` is never rendered. The only seller signal is the
  *PRO* badge, and that is driven by `role === 'business'`, not by verification.

This matches the legacy card, so it is not a V2 regression, and §6 asks for an audit rather
than mandating presence. But given how much of the ТЗ leans on trust (verification signals,
anti-fraud), placing a verified marker on the card is a product decision worth taking
deliberately rather than by omission. It is a small change — the data is already on the card's
`ad.user` object.

## 4. Not covered

- Responsive `srcset`/`sizes` output: the card routes through `sizedImage(url, width)`, which
  was verified to produce a sized URL, but a full DPR/`srcset` matrix was not exercised.
- Deleted-listing behaviour on the *detail* route beyond the status guard.
- Real-image rendering quality at every breakpoint (the crafted images 404 by design, so the
  placeholder path was exercised instead — which is itself one of the §6 cases).
