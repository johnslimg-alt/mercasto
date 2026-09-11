# Home V2 — language selector audit (ТЗ §4)

Requirement: the custom dropdown already built for V2 must be spread across all of Mercasto;
11 languages, long names, Arabic RTL, keyboard, Escape, Tab, click-outside, selected state,
screen-reader labels, scrolling without a scrollbar. The system `<select>` should be removed
from the public UI.

Method: production build, Chromium. A census of system `<select>` elements per public route,
plus a behavioural suite driving the custom menu.

## 1. The custom menu itself is correct — 14/14 checks pass

| Check | Result |
| --- | --- |
| trigger exists / `aria-haspopup=listbox` / `aria-expanded=false` initially | pass |
| opens on click, `aria-expanded=true` while open | pass |
| `role=listbox` with an accessible name | pass |
| **11 language options** | pass (found 11) |
| exactly one option `aria-selected` | pass (ES) |
| internal scrolling with the bar hidden | pass (scrollable, `scrollbar-width:none`) |
| Escape closes | pass |
| click outside closes | pass |
| Enter opens from the keyboard | pass |
| choosing AR flips `document.dir` to `rtl` | pass |
| menu still opens in RTL | pass |

All 11 languages are present, so long and non-Latin labels (ZH, KO, JA, AR, RU) are rendered
from the same option list without truncation problems.

## 2. It is still enabled on exactly one route — the actual §4 gap

`useCustomLanguageMenu` is wired to the staging path only:

```jsx
// src/App.jsx:4216
useCustomLanguageMenu={location.pathname === '/design-v2'}
```

Census of visible system `<select>` elements on public surfaces:

| Route | Visible selects | Language `<select>` present? |
| --- | --- | --- |
| `/design-v2` | 2 | **no — custom menu** |
| `/` (legacy home) | 3 | **yes — `desktop-language-select`, 11 options** |
| `/listings` | 4 | **yes — `desktop-language-select`** |
| `/ads/6376` (ad detail) | 1 | **yes — `desktop-language-select`** |

So the custom menu improves exactly one surface. **After cutover only `/` would get it**, and
`/listings`, ad detail, the verticals and every other public screen would still show the
system language `<select>` — the case §4 asks to remove.

Fix: enable the custom menu unconditionally on the public shell (or invert the flag to
opt-out for authenticated/admin surfaces) rather than keying it to a path. That is a one-line
condition change plus a visual pass over the header on each route, not new component work —
the component and its accessibility are already done.

## 3. The remaining `<select>` elements are filters, not the language selector

The other visible selects are functional filter controls, not language:

| Route | Control | Options |
| --- | --- | --- |
| `/design-v2`, `/` | `home-auto-year-filter` (Año) | 13 |
| `/design-v2`, `/` | `home-auto-price-filter` (Precio) | 6 |
| `/listings` | `sidebar-filter-state` (Estado) | 33 |
| `/listings` | `sidebar-filter-city` (Ciudad / Municipio) | 1 |
| `/listings` | `sidebar-filter-sort` (Ordenar por) | 5 |

If §4's "remove the system `<select>` from the public UI" is meant to cover these too, that is
a substantially larger piece of work — 33 US states in a native select is exactly where a
native control is most defensible, and each of these is queried by the existing e2e suite via
`selectOption(...)`. Recommend treating the language selector as the §4 scope and deciding
separately whether filter selects should be replaced.

## 4. Browser caveat

The visual rendering of a native `<select>` popup is OS-controlled and cannot be styled or
captured reliably; only the closed control is compared here. That is itself an argument for
the custom menu on user-facing surfaces.

## 5. Correction and scoped migration plan

An earlier summary of this audit called enabling the menu everywhere "a one-line condition
change". That was wrong, and the check that invalidates it is worth recording.

Four specs drive the **native** select, so flipping the condition would break them:

| Spec | What it does with the native select |
| --- | --- |
| `production-i18n-qa.spec.js` | on `/`, asserts the native select contains **exactly the 11 active language codes** and excludes `he`/`yi` |
| `header-geometry.spec.js` | reads `desktop-language-select` |
| `archived-language-fallback.spec.js` | reads `desktop-language-select` |
| `mobile-shell-touch-targets.spec.js` | checks `mobile-language-select` for a 48px target |

The first one is the §8 eleven-language gate, so enabling the custom menu on `/` without
migrating it would trade a UI improvement for a lost language-verification gate.

### Prepared groundwork (done)

Each option in the custom menu now carries `data-testid={`language-option-${code}`}`, so the
migration is mechanical: open the trigger, read the option testids, click one. Verified that
the menu still passes its full behavioural suite (14/14) after the addition, and the change is
purely additive.

### Migration steps for whoever takes it

1. Add a small shared helper in the specs: open `desktop-language-menu-button`, then assert or
   click via `language-option-<code>`.
2. Port `production-i18n-qa` to enumerate `language-option-*` instead of native `<option>`
   values, keeping the same 11-code assertion and the `he`/`yi` exclusions.
3. Port the other three specs off `*-language-select`.
4. Only then disable the native branch, i.e. drop the `useCustomLanguageMenu` condition.
5. Re-run the four specs plus this audit.

Steps 1–4 touch shared test infrastructure and the production QA gate, which is why this is
scoped as a follow-up rather than done alongside the homepage work.
