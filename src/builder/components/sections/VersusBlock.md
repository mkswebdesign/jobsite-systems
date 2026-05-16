# VersusBlock

Head-to-head comparison band. Two columns of paired statements: the way most operators do it (left, dampened, struck through with an `×`) versus the way the brand does it (right, accent + checkmark). Each row is the same point cast both ways, so the contrast carries the argument without needing prose. Distinct from `contentSection` (single-column editorial) and `statRibbon` (numerical proof) — this type's job is positioning by direct comparison.

- **`type`:** `versusBlock`
- **Component:** `VersusBlock.astro`
- **Schema:** `versusBlockSection` in `src/content/config.ts`
- **Used by:** landscape-systems (homepage `01b`).

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"versusBlock"` |
| `heading` | yes | Section heading. Brand-voice declarative — sets the contrast frame. |
| `leftLabel` | yes | Column label for the "from" side (e.g. "Most landscape sites"). |
| `rightLabel` | yes | Column label for the "to" side (e.g. "Landscape Systems"). |
| `rows` | yes | 2–8 paired `{ left, right }` items. Both halves of each row should describe the SAME point cast two ways. |
| `subtext` | no | Optional 1–2 sentence intro under the heading. |
| `cta` | no | `{ label, href }`. Optional. |
| `sectionLabel` | no | Optional 1–3 word eyebrow above the heading. |
| `variant` | no | `A` / `B` — see Variants. Defaults to `A`. |

## Editor wiring

Root element declares:
- `data-section-type="versus-block"` (editor identity / CHIP-LBL key)
- `data-section-label="Versus block"` (CHIP-LBL display name)
- `data-section-variants="A:Standard,B:Stacked"` (variant picker)

Participates in the section-overrides system — `Base.astro` applies `data-sec-theme`, `data-sec-disabled`, and `--accent` CSS vars. Per-brand CSS should respect these.

## Variants

Declared on root as `data-section-variants="A:Standard,B:Stacked"`.

- **A (Standard)** — side-by-side columns with a vertical "vs." divider between them. Default desktop treatment; collapses to a stacked layout under ~720px.
- **B (Stacked)** — both columns stacked vertically (left then right) at every breakpoint. Reads quieter; useful when the section follows another two-column band that's already used the side-by-side rhythm.

Variant attr is set on `<html>` (e.g. `html[data-versus-block-variant="B"]`), so per-brand CSS should select via dual-form selectors per the section-variant convention (`[data-versus-block-variant='B'] .versus-block` AND `.versus-block[data-versus-block-variant='B']`).

## Theme / mode awareness

Participates in section-overrides via `data-sec-theme`:

- `data-sec-theme="primary"` — brand-primary surface, dark text. Left "from" column desaturates against the primary surface.
- `data-sec-theme="light"` / `"white"` — light surface, dark text.
- `data-sec-theme="dark"` / `"black"` — dark surface, light text. Default-feeling treatment.
- _(no sec-theme)_ — inherits the current theme mode (vibrant / dark / bright).

## Behavior notes

- **No client-side JS.**
- **Accessibility:** `<h2>` heading. Each column's label is a `<p>` (not a heading) so screen readers don't interpret the visual contrast as a hierarchy. The `×` and `✓` icons are `aria-hidden` SVGs — the row's text is what conveys meaning. The `vs.` divider is `aria-hidden` decorative.
- **Strikethrough is decorative, not semantic** — left-column rows are dampened by colour and a tracking `×` icon, not `<s>` / `text-decoration: line-through`, so the screen-reader output reads "Most landscape sites: Powered by WordPress …" cleanly.

## Brand override hints

```css
.versus-block { /* padding, surface */ }
.versus-block__inner { /* max-width, gap */ }
.versus-block__heading { /* scale, weight, tracking */ }
.versus-block__grid { /* two-column layout, divider, breakpoints */ }
.versus-block__column--from { /* dampened tone */ }
.versus-block__column--to { /* accent tone */ }
.versus-block__cta { /* button chrome */ }
```

Collapse to a single column on narrow viewports — keep the labels visible above each list so the contrast still reads.

## Example

See `content/_examples/sections.json` → `versusBlock`.
