# Mercasto design token contract

Contract version: `2026-08-04`.

Web and mobile share the same product primitives. Platform components may compose them differently, but must not redefine the core values.

| Token | Value | Purpose |
| --- | --- | --- |
| Brand | `#84CC16` | Primary actions, active state, success accent |
| Brand dark | `#65A30D` | Hover/pressed state (3.09:1 on white: not for text on light surfaces) |
| Ink | `#111827` | Primary light-mode text |
| Navy | `#0F172A` | Dark backgrounds, headers and high-contrast actions |
| Muted | `#64748B` | Secondary light-mode text |
| Paper | `#F8FAFC` | Light application background |
| Surface | `#FFFFFF` | Light cards and controls |
| Raised surface | `#F1F5F9` | Light secondary panels |
| Line | `#E2E8F0` | Light borders and separators |
| Dark background | `#0F172A` | Dark application background |
| Dark surface | `#111827` | Dark cards and controls |
| Dark raised surface | `#1F2937` | Dark secondary panels |
| Dark line | `#64748B` | Dark borders and separators (>= 3:1 on every dark surface, WCAG 1.4.11) |
| Dark ink | `#F8FAFC` | Dark primary text |
| Dark muted | `#CBD5E1` | Dark secondary text |
| Radius small | `8px` | Compact cards and controls |
| Radius medium | `12px` | Standard controls |
| Radius large | `14px` | Product cards and primary actions |
| Radius extra large | `18px` | Prominent containers |
| Touch target | `48px` | Primary interactive controls |

`lime-primary` and `lime-dark` remain compatibility aliases for the brand colors. The former turquoise values are forbidden.

## Revision 2026-09-12 — dark line raised for WCAG 1.4.11

`Dark line` changed from `#334155` to `#64748B`. `#334155` measured 1.41:1 against
`Dark surface` (`#111827`) and 1.41-1.72:1 against the dark surfaces actually
rendered (`#1E293B`, `#0F172A`), so card borders and separators were invisible in
dark mode. `#64748B` measures 3.07:1 on `#1E293B`, the lightest dark surface in
use, and 3.75:1 on `#0F172A`.

Brand accent text on light surfaces uses `#4D7C0F` (4.99:1 on white) and
`#365314` on lime-tinted surfaces (7.85:1). `Brand dark` (`#65A30D`) is a hover
fill only: at 3.09:1 on white it does not meet 1.4.3 for normal text. `Brand`
(`#84CC16`) remains correct on dark surfaces (9.0:1 on `#0F172A`) and as a fill.
