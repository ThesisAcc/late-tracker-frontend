# LateTrack Design & Architecture Refactor

Rebuild the LateTrack UI on a clear information hierarchy, adopt the Paschal
Inventory company identity, and resolve the CSS and component duplication in the
current implementation.

---

## Locked decisions

1. **Theme depth** — identity only: brand green, status colours, spacing/type/radius
   scales. No skeuomorphic shadows, no glass blur, no 30px radii. Contrast-neutral
   against the current palette.
2. **Dark mode** — not built. The token layer is structured to accept a
   `[data-theme='dark']` block later without rework.
3. **Logo** — 128px seal on a dark plate in `EmptyState`, 72px on a plate in the
   `ImportDialog` masthead, wordmark-only lockup in the sticky header, gold-on-green
   favicon.
4. **Scope** — one sequenced pass: design first, then CSS split, then components.

### Source of truth for the company theme

`/home/arisu/Paschal_Inventory/frontend/src/theme/theme.module.css`

That file is a global CSS-variables definition inside a CSS Module, not component
styling. It is the only brand theme in the repository tree.

The theme's decoration layer is deliberately **not** adopted. It uses
`--glass-blur` 179 times, `--glass-border` 164 times, `--glass-bg` 123 times,
skeuomorphic `--shadow-raised` 90 times, `border-radius: 30px` 75 times and
`50%` 59 times. Those are the exact patterns this refactor exists to remove.

Six of its eight greens fail WCAG AA against white text:

| Green | Contrast on white | AA for normal text |
| --- | --- | --- |
| `--color-green-deep` `#0f6e3a` | 6.34:1 | pass |
| `--color-green-mid` `#2e8b0e` | 4.36:1 | large text only |
| `--color-green-base` `#3aaa14` | 3.03:1 | large text only |
| `--color-green-light` `#4cc010` | 2.37:1 | fail |
| `--color-green-lighter` `#6dd820` | 1.83:1 | fail |
| `--color-green-accent` `#b8f040` | 1.35:1 | fail |
| `--color-green-glow` `#e8ff90` | 1.10:1 | fail |

Only `--color-green-deep` is adopted as a brand colour.

---

## Part 1 — Token layer (`src/index.css`)

Replaces the scattered custom properties. Company values where they pass,
deliberately diverged where they do not.

### Colour

Semantic model, so that green never means two things.

| Token | Value | Note |
| --- | --- | --- |
| `--color-brand` | `#0f6e3a` | theme `green-deep`; 6.34:1 on white. The current teal `#176b6d` is 6.25:1, so this is contrast-neutral. |
| `--color-brand-strong` | `#0b5630` | **derived.** The theme ships no darker step for hover states. |
| `--color-brand-tint` | `#e8f2ec` | wells and chart area fill |
| `--color-danger` | `#c94a5e` | 4.54:1 on white, AA. Fixes today's `#c4405a` at 3.26:1. |
| `--color-warning` | `#b3701f` | **derived**, darker than the theme's `#c77d2a`, so it passes for small text. |

**Status semantics change.** `late` maps to danger red. `clear` / no-lateness maps
to **neutral grey, not green**. Green is then used only for brand and the single
data series, and red is the only alarm colour in the application.

**Deleted tokens:** 6 of 8 theme greens, `--color-slate-1/2/3` (both light and dark
variants have the inverted-black-background bug), all 9 `--skeuo-*`, all 9
`--glass-*`, and roughly 50 ad-hoc hex values.

**Kept from the theme:** `--ease-smooth`, `--ease-out`, `--transition-fast`,
`--transition-slow`.

### Type

Eight named roles replace 13 ad-hoc sizes and 5 weights. The non-standard weights
650/750/850 are dropped because they do not render on static font weights.

| Token | Value | Role |
| --- | --- | --- |
| `--text-display` | `clamp(24px, 2.6vw, 30px)` | page `h1` |
| `--text-title` | `19px` | dialog titles |
| `--text-heading` | `17px` | panel `h2` |
| `--text-body` | `14px` | paragraphs |
| `--text-ui` | `13px` | buttons, table cells |
| `--text-label` | `12px` | labels |
| `--text-micro` | `11px` | footer, metadata |
| `--text-overline` | `10px` | table headers, overline labels |

### Space

Ten steps on a 4px scale, from the theme's `xs…3xl` plus the two extras the current
density needs.

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`

### Radius

`6 · 8 · 12 · full`

Deliberately diverges from the theme's `8/10/16/24/32`, which is rounded-card
language.

### Shadows

Two recipes only:

- `--shadow-flat` — none
- `--shadow-raised` — single `0 1px 2px rgb(0 0 0 / 0.06)`

Replaces both the 13px-offset skeuomorphic stack and the 4-radii x 2-shadows x
3-opacities x 2-blur stack.

---

## Part 2 — Hierarchy

1. **`h1` 44px to 30px maximum.** A 44px headline is landing-page scale on a data
   tool. The new 30 / 19 / 17 scale gives real steps instead of one giant title
   above a wall of 11–13px text.

2. **Eyebrows 7 down to 2.** Keep the page-level overline on `h1` and the
   `ImportDialog` one. Remove them from "Team trend", "Worker records",
   "Personal breakdown", "Employee record" and "Preview". Seven identical
   tiny-caps-plus-heading blocks is the clearest "generated" tell in the current
   build.

3. **Four metric cards become one stat ledger.** A single bordered block, 4 columns
   divided by 1px rules, column 1 as the primary figure. This drops the
   hero-plus-three-cards pattern, the 3px `::before` accent bars, and 3 of the 4
   metric-card breakpoints. The ledger self-adapts via
   `repeat(auto-fit, minmax(200px, 1fr))`. The ledger overline carries the real
   month label, so the per-card month labels go away. `MetricCard`'s `tone` prop is
   deleted with it.

4. **Numbers get typographic weight.** `font-variant-numeric: tabular-nums`,
   right-aligned, consistent thousands separators. The minute count is the point of
   the application and currently renders identically to its own label.

5. **One surface recipe** via a shared `Panel`, replacing flat-white-plus-4px-shadow,
   the dashed empty state, the gradient `worker-identity`, and the glass header in
   one move.

6. **Chart.** Stroke `--color-brand` at 6.34:1, up from `#2d8172`'s 4.67:1. 2px
   width, thin-smooth curve, palette-tint fill, `--color-brand-strong` active dot,
   `--color-border` grid. The class names `.month-chart__area` and
   `.month-chart__line` are preserved so `MonthlyBreakdown.test.tsx` passes
   untouched.

---

## Part 3 — Logo

The company logo is a fine-detail gold circular seal, 500x500 RGBA with 40%
transparent corners, a free-standing mark rather than a square badge. Dominant
colours are gold `#f0e010` at roughly 50%, black at 16%, red `#d00000` at 3.8% and
green `#009020` at 1.9%.

Two constraints follow. Gold is 1.25:1 against the theme's pale `#f2f6f0`, so the
mark's edge effectively disappears without a plate behind it. And the ring
lettering is unreadable below roughly 96px, so small placements look like a gold
blob rather than a seal.

- Copy `Logo.png` to `public/paschal-seal.png`. No plate is baked into the source.
- `EmptyState`: 128px on `#0b2e1c`, 16px radius, 40px inset.
- `ImportDialog` masthead: 72px on the same plate.
- Sticky header: wordmark only. Keep the 32px `LT` roundel, recoloured to brand
  green. Not the seal.
- Favicon `public/favicon.svg`: keep the existing clock-arrow mark and recolour it.
  Plate `#163F4A` to `#0b5630`, stroke `#7FD1C7` to `#f0e090` (seal gold, slightly
  desaturated for 16px legibility). The detailed seal is unusable as a favicon.

---

## Part 4 — Accessibility fixes

1. **Focus ring.** The current teal glow measures about 1.6:1 and fails WCAG 2.2
   SC 1.4.11. Replace it with `outline: 2px solid var(--color-brand)` at 6.34:1 plus
   `outline-offset: 2px`, and a white inner ring for contrast against dark fills.

2. **File picker.** The input is `opacity: 0` over a styled label, so it takes focus
   with no visible ring. `input:focus-visible + label` gets a `box-shadow` ring.
   `Escape` now clears the selection instead of silently failing.

3. **Table semantics at 720px and below.** `thead { display: none }` destroys header
   association. The stacked-card layout is still the right call, but `thead` moves
   behind an `.sr-only` class (visually hidden, still exposed to assistive
   technology), and rows gain `role="row"` with cell `aria-label`s via the existing
   scope props.

---

## Part 5 — CSS split

`App.css` goes from 1,394 lines to roughly 120 lines of page layout only.
Per-component CSS files are added for all 16 components plus the 5 new primitives,
following the pattern already established in `AppShell.css`, `MetricCard.css` and
`ManagerDashboard.css`.

Also replace the three duplicated `width: calc(100% - 40px)` declarations with a
`--container-width` token plus responsive `padding-inline`. This fixes the
inconsistency at 980px, where padding shrinks but width does not.

---

## Part 6 — Component architecture

- **New shared primitives:** `Panel`, `StatLedger`, `Overline`, `Dialog` (shared
  shell with backdrop, `role="dialog"`, focus trap and Escape handling), plus a
  shared `Field.css`.
- `Dialog` absorbs the duplicated mount/focus effect in `ImportDialog.tsx` and
  `WorkerDetailDialog.tsx`.
- **`src/utils/format.ts`** exports `formatMinutes`, `formatSignedMinutes`,
  `formatMonthLabel`, `formatWeekdayShort` and `toDateKey`, removing 5 duplicate
  implementations.
- `ManagerDashboard.tsx` goes from 319 lines to roughly 120, split into a
  `ManagerMonthSelect` and a `WorkerRecordsTable`.
- `MonthlyBreakdown.tsx` drops its parallel-bars branches; `useDashboardData`
  covers all four views.
- A `useResponsive` hook replaces the three `window.innerWidth` listeners.

**Preserved:** PascalCase filenames, the hand-rolled `withBrowserTimeout` test
helper, `[data-testid]` discipline, no new dependencies, and all class names the
tests assert on.

---

## Execution order

Each phase is verified with `npm run lint`, `npm run typecheck`, `npm test`
(expect 76 passing) and `npm run build`.

- [ ] **Phase 1** — Tokens in `index.css`, then `AppShell.css`, `App.css` and
      primitive CSS.
- [ ] **Phase 2** — Hierarchy: eyebrow removal, stat ledger, number typography,
      surface recipe.
- [ ] **Phase 3** — Logo and favicon.
- [ ] **Phase 4** — The three accessibility fixes.
- [ ] **Phase 5** — Per-component CSS split.
- [ ] **Phase 6** — Component extraction and `format.ts`.
- [ ] **Phase 7** — `useResponsive` hook, replacing the three `window.innerWidth`
      listeners.

---

## Known limitations

**Visual verification is not automated.** There is no image input available to the
implementing agent and no browser, so "does this look designed by a human" cannot be
checked programmatically. Contrast is verified numerically and the build is kept
green, and computed-style assertions will be added for the token values and the
focus ring so regressions are caught mechanically. A human still needs to review the
result visually.

**Deliberate visual deltas,** so they can be reversed if unwanted:

- `h1` 44px to 30px
- panel `h2` 21px to 17px
- spacing adjustments of 1–2px as 24 values collapse to 10
- radius 13px to 12px
- card shadows to flat borders
- `clear` status from green to neutral

Changing `clear` from green to neutral is the single change that most alters the
application's voice.

## Out of scope

- **Dark mode.** Structured for, not built.
- **Chart type change from area to column.** Columns would be more honest for 12
  discrete monthly values, but the change breaks two assertions in
  `MonthlyBreakdown.test.tsx` and was not requested. This can be folded in on
  request.
