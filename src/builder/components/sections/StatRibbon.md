# StatRibbon

A horizontal strip of proof points — number + label pairs, optional sublabel. Use when the page needs a beat of measurable substance: years in business, projects shipped, plugins required, response time. Distinct from DesignBreak (atmospheric visual breath) and ContentSection (editorial prose) — StatRibbon is data first.

- **`type`:** `statRibbon`
- **Component:** `StatRibbon.astro`
- **Schema:** `statRibbonSection` in `src/content/config.ts`
- **Used by:** demo / not yet adopted by a shipping brand.

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"statRibbon"` |
| `stats` | yes | Array of 1–6 `{ value, label, sublabel? }` items. Items missing `value` or `label` are filtered out at render time. |
| `heading` | no | Optional heading above the stats row. |
| `sectionLabel` | no | Optional 1–3 word eyebrow above the heading. |
| `cta` | no | `{ label, href }`. Optional — many proof-point ribbons need none. |
| `variant` | no | `A` / `B` / `C` — see Variants. Defaults to `A`. |

## Editor wiring

Root element declares:
- `data-section-type="stat-ribbon"`
- `data-section-label="Stat ribbon"`
- `data-section-variants="A:Compact,B:Display,C:Bordered"`

Participates in the section-overrides system — `Base.astro` applies `data-sec-theme`, `data-sec-disabled`, and `--accent` CSS vars.

## Variants

Declared on root as `data-section-variants="A:Compact,B:Display,C:Bordered"`.

- **A (Compact)** — single horizontal row, modest sizing, brand surface. The default; reads as one breath.
- **B (Display)** — oversized numbers, more vertical breathing room. Hero-adjacent treatment.
- **C (Bordered)** — bordered grid cells, 2-up on mobile, 4-up on desktop. Reads as a substantive table.

Variant attr is set on `<html>` (e.g. `html[data-stat-ribbon-variant="B"]`), so per-brand CSS should select via a generic ancestor selector.

## Theme / mode awareness

Participates in section-overrides via `data-sec-theme`:

- `data-sec-theme="primary"` — brand-primary surface, dark text.
- `data-sec-theme="light"` / `"white"` — light surface, dark text.
- `data-sec-theme="dark"` / `"black"` — dark surface, light text.
- _(no sec-theme)_ — inherits the current theme mode.

## Behavior notes

- **No client-side JS.**
- **Accessibility:** stats render as `<ul role="list">` with `<li>` items. Each value is a `<span>`, label/sublabel are siblings — screen readers read "value, label" naturally. The list role ensures Safari doesn't strip the list semantics when CSS removes bullets.
- **Motion:** brand CSS can apply `aedSectionElEnter` to each `.stat-ribbon__item` for a staggered reveal on scroll-driven view timelines.

## Brand override hints

```css
.stat-ribbon { /* padding, surface */ }
.stat-ribbon__inner { /* max-width, gap */ }
.stat-ribbon__body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: clamp(1rem, 3vw, 2rem);
}
.stat-ribbon__value { /* numerals: scale, weight, tracking */ }
.stat-ribbon__label { /* small caps, muted */ }

[data-stat-ribbon-variant='B'] .stat-ribbon__value { font-size: clamp(2.5rem, 6vw, 4rem); }
[data-stat-ribbon-variant='C'] .stat-ribbon__item { border: 1px solid var(--border); padding: 1.5rem; }
```

## Example

See `content/_examples/sections.json` → `statRibbon`.
