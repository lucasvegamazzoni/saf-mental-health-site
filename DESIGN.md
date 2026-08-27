# SAF Check-in — Design Rules

The single source of truth for how this site looks, feels and moves. Every page,
component and agent follows it. When in doubt: **calm, warm, honest, anonymous.**

## 1. Voice

- Central message: *struggling is normal, growth is possible, no one has to face it alone.*
- Warm, plain, second person. Short sentences. No clinical or corporate language.
- Never ask for, display or imply a real name, rank, unit, NRIC or email. "Username" is
  the only identity word.
- Be honest about what is and isn't built: a stub says it's a stub; nothing is
  uploaded silently; no fake success states.
- Emergency help is always one tap away (global button) and is never gated.

## 2. Tokens (locked — `src/index.css`)

| Token | Hex | Use |
|---|---|---|
| `--cream` | #f6eee2 | page ground, tinted panels |
| `--paper` | #fbf7ef | cards, inputs on cream |
| `--sky-top` / `--sky-bottom` | #f4efe6 / #dcE9ee | hero sky gradient only |
| `--ink` | #2e3a34 | body text, pupils, strokes |
| `--pine` | #42604f | primary text accents, links, active states, spinner |
| `--pine-deep` | #33463c | headings |
| `--sage` | #a9bfa0 | selected chips, soft fills |
| `--sage-deep` | #7e9b77 | icons, meters, dashed rules |
| `--blue-hill` | #bfd4de | secondary tints, cloud outline |
| `--terra` | #c0684b | the ONE call-to-action colour, alerts, "needs attention" |
| `--terra-soft` | #d98e62 | focus rings, cheeks, warm accents |
| `--gold` | #c9a664 | rare highlight (sun, badges) |

Rules
- Never introduce a new colour. Derive with `rgba(<token>, α)` or
  `color-mix(in srgb, var(--token) N%, black|white)`.
- Muted text = `rgba(46, 58, 52, 0.72)` (≥ 4.5:1 on paper/cream — verified). Never below
  0.55 alpha for text.
- Terracotta is scarce on purpose: one primary action per view, plus the emergency button.
- No pure white surfaces except the cloud's eyes and the story cards' `#fff` is **not** allowed
  — use `--paper`.

## 3. Type

- Display: **Fraunces** 500/600 (`--font-display`) for h1–h3 and pull-quotes. Letter-spacing −0.01em.
- Body/UI: **Karla** 400/500/600/700 (`--font-body`). Base 16px, line-height 1.6 for prose, 1.25 for headings.
- Scale (clamp): h1 `clamp(1.8rem, 4.5vw, 2.4rem)` · h2 `clamp(1.35rem, 3vw, 1.7rem)` · h3 1.1rem · body 1rem · small 0.9rem · micro 0.82rem (never smaller for readable text).
- Kickers: 0.78rem, 700, letter-spacing 0.08em, uppercase, `--terra` or `--pine`.
- Never use Inter, system-ui-only stacks, or a third family.

## 4. Space & shape

- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px. Sections breathe: 48–64 px vertical on desktop, 32–48 px on mobile.
- Page columns: content `max-width: 620px` (flows), `max-width: 900px` (grids). Centred with `margin: 0 auto; padding: 0 1.25rem`.
- Radius: cards 20–24 px · inputs 14 px · chips/buttons 999 px · tiny tags 10 px.
- Borders: `1px solid rgba(66, 96, 79, 0.12)`; dashed `1.5px dashed rgba(126,155,119,0.55)` for "private / not yet" framing.
- Shadows: soft and low — `0 12px 32px rgba(46,58,52,0.06)` (cards), `0 10px 24px rgba(192,104,75,0.3)` (terra CTA). Nothing sharper.

## 5. Components (recipes — copy the classes, don't reinvent)

- **Primary button** `.x-primary`: terra fill, paper text, 999px, min-height 48px, weight 700. Disabled = opacity 0.45, no shadow.
- **Secondary button** `.x-secondary`: transparent, `1.5px solid rgba(66,96,79,0.3)`, pine text. Hover `rgba(169,191,160,0.2)`.
- **Chip / toggle**: cream fill, 999px, min-height 44px, selected = sage fill + pine border, `aria-pressed`.
- **Segmented tabs** (`.me-tabs`, `.account-modes`): cream track, 4px padding, active pill is paper with `0 2px 8px rgba(46,58,52,0.1)`; `role="tablist"`.
- **Card**: paper, radius 22, border, soft shadow; inner tinted panel = cream.
- **Gate** (`SignInGate`): dashed card, kicker, one primary + one secondary.
- **Input**: cream fill, 14px radius, 48px min-height, visible label above (never placeholder-only), error text in terra directly beneath with `role="alert"`.
- **Spinner**: `<Spinner />` (pine morph). Use for any wait > 300 ms; reserve the space so nothing jumps.
- **Empty state**: illustration + one-line title + one action. Never a blank panel.
- Icons: inline SVG only, `currentColor`, 1.5–2px strokes. **Emoji are content, not icons** — allowed only where the product spec uses them (check-in scale, theme tags, markers).
- The leaf mark appears in exactly two places: nav wordmark and footer sign-off. Nowhere else.

## 6. Motion

- Subtle tier: 150–300 ms, `ease-out`; scroll reveals ≤ 12 px translate + fade. Nothing decorative-only.
- The hero parallax and the QR tree are the two "moments"; everything else stays still.
- Every animation is wrapped in `@media (prefers-reduced-motion: no-preference)` or checked via `matchMedia`; reduced-motion users see the final state immediately.
- Animate `transform`/`opacity` only. Never width/height/top.

## 7. Layout & responsive

- Mobile-first. Verify at 390, 768, 1280. No horizontal scroll, ever.
- Tap targets ≥ 44×44 px with ≥ 8 px between them.
- Bottom-right 96 px is reserved for the emergency button; keep primary actions clear of it on mobile (add bottom padding to forms).
- Deep-linkable state: tabs and filters live in the URL (`?tab=`, `?theme=`).

## 8. Accessibility (non-negotiable)

- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI strokes. Focus ring `3px solid var(--terra-soft)`, offset 2–3 px, on every interactive element.
- Semantic landmarks: one `h1` per page, `nav`, `main`, `aside`, `role="tablist/tab/tabpanel"`, `aria-pressed` on toggles, `aria-live="polite"` for progress, `role="alert"` for errors.
- Labels visible; helper text before the field; errors next to the field with a recovery path.
- Keyboard: everything reachable and operable; Escape closes overlays; no focus traps without a way out.
- Images: meaningful `alt`; decorative SVG `aria-hidden="true"`.

## 9. Data & privacy (design-level rules)

- Local first: check-ins are written to the device before any network call.
- Anything that leaves the device says so in plain words next to the action.
- Public content (stories, recognitions, polls) is published only after moderation and never carries a uid in the UI.
- Never show another user's username on public surfaces.

## 10. Definition of done for any UI change

1. Build + oxlint clean.
2. Screenshot at 390 and 1280 (`verify/` scripts) and look at both.
3. Tab through it once; check focus ring and reduced-motion.
4. Copy reviewed against §1 — no names, no fake success, no clinical tone.
