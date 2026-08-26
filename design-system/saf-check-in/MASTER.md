# SAF Check-in — Design System (MASTER)

> Source of truth: `/DESIGN.md` at the repo root. This file exists for the
> ui-ux-pro-max retrieval convention; it never overrides DESIGN.md.

## Locked palette (do NOT use the tool's generated cyan palette)

| Role | Token | Hex |
|---|---|---|
| Background | `--cream` | #f6eee2 |
| Surface | `--paper` | #fbf7ef |
| Foreground | `--ink` | #2e3a34 |
| Primary | `--pine` | #42604f |
| Heading | `--pine-deep` | #33463c |
| Soft fill / selected | `--sage` | #a9bfa0 |
| Icon / meter | `--sage-deep` | #7e9b77 |
| Secondary tint | `--blue-hill` | #bfd4de |
| CTA / alert | `--terra` | #c0684b |
| Focus ring / warm accent | `--terra-soft` | #d98e62 |
| Rare highlight | `--gold` | #c9a664 |

## Typography
- Display: Fraunces (500/600) · Body/UI: Karla (400–700) · base 16px.

## Dials
- Variance 3 (centred, minimal) · Motion 3 (subtle) · Density 3 (spacious).

## Rules carried from ui-ux-pro-max (kept)
- Touch targets ≥ 44px, ≥ 8px apart; visible focus rings; errors announced (`role="alert"`) and placed next to the field; loading → success/error feedback on every submit; empty states guide with one action; active nav state; deep-linkable state in the URL; reserve space to avoid layout shift; lazy-load heavy components; stable list keys; reduced-motion respected; no emoji as UI icons (emoji only where the product spec uses them as content).

## Pages
Page overrides go in `pages/<name>.md`; none yet.
