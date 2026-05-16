# DesignBreak

Visual breather band. Sits between content-heavy sections and gives the page a moment to breathe — full-bleed background (image or brand gradient) with a short heading and a single CTA overlaid. Use sparingly: one per long landing page is usually right.

- **`type`:** `designBreak`
- **Component:** `DesignBreak.astro`
- **Schema:** `designBreakSection` in `src/content/config.ts`
- **Used by:** landscape-systems (flinthills demo home page; opt-in per section).

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"designBreak"` |
| `heading` | yes | Short, punchy line — this is the whole point of the section. |
| `cta` | yes | `{ label, href }` — the "simple" call to action. Keep it to one. |
| `sectionLabel` | no | Eyebrow above the heading. Often omitted — a breather doesn't always need framing. |
| `subtext` | no | One-line support under the heading. |
| `backgroundImage` | no | Image URL. When present, the component renders a dedicated `.design-break__bg` layer (background-image set via `--design-break-bg-image` CSS var on the section) and flips `data-has-bg="true"`. The dedicated layer exists so brand CSS can drive a true scroll-driven parallax via `transform: translateY()` on the layer (see landscape-systems.css). When absent, brand CSS provides a gradient/color fallback on the section itself. |
| `secondaryCta` | no | `{ label, href }`. Variant **D only** — second action shown to the right of the primary CTA inside `.db-card__actions`. Variants A/B/C/E hide the wrapper. Use sparingly: a breather earns its punch from one CTA. |
| `stats` | no | Array of up to 4 `{ value, label }` pairs. Variants **D and E** only — populates the 2x2 stats grid in the right column of the card. Falls back to a sensible default set defined in `DesignBreak.astro` (`DEFAULT_STATS`) when absent so D/E never render an empty panel. Variants A/B/C hide the panel via `display: none`. Authoring tip: keep `value` short (≤6 chars). Variant E animates numeric values via count-up on intersection — values with a leading numeric run (e.g. `"100%"`, `"2 wks"`, `"0"`) animate; values without one (e.g. `"<1s"`, `"Same Day"`) paint instantly. |
| `steps` | no | Array of 3–6 `{ number, title, body? }` entries. **Variant E only** — renders a numbered process list inside `.db-card__copy` between the subtext and the CTA. Variants A/B/C/D ignore the field. Each step row reveals on intersection with an 80ms stagger; `prefers-reduced-motion: reduce` disables the stagger and paints all rows at rest state. |
| `variant` | no | One of `'A' \| 'B' \| 'C' \| 'D' \| 'E'`. Per-section override that pins the section to a specific variant regardless of the site-wide `html[data-design-break-variant]` setting. Omit to let the brand default + editor's site-wide variant chip control the look. Emitted on the section as `data-design-break-variant`; brand CSS should match both forms (see _Variants_ below). |

## Editor wiring

Root element declares:
- `data-section-type="design-break"` (editor identity / CHIP-LBL key)
- `data-section-label="Design break"` (CHIP-LBL display name)
- `data-section-variants="A:Default,B:Aligned,C:Minimal,D:Spotlight,E:Process"` (variant picker)
- `data-design-break-variant={variant}` when the per-section `variant` prop is set (per-section override; otherwise undefined and the html-level variant from the editor wins)

Participates in the section-overrides system — `Base.astro` applies `data-sec-theme`, `data-sec-parallax-bg`, `data-sec-disabled`, and `--accent` CSS vars. Per-brand CSS should respect these (see brand-override hints below).

## Variants

Declared on root as `data-section-variants="A:Default,B:Aligned,C:Minimal,D:Spotlight,E:Process"`.

- **A (Default)** — centered text, full-bleed background, CTA below the copy. The typical breather treatment.
- **B (Aligned)** — text left, CTA right (or below-left on mobile). More editorial; pairs well with image backgrounds where the focal point is on the right.
- **C (Minimal)** — compact one-line band; drops the hero scale and pulls the CTA inline so the section reads as a divider rule. Pairs well with `data-sec-theme="primary"` for a lime callout.
- **D (Spotlight)** — editorial card pinned over a Ken-Burns + scroll-parallax photo. The card is a 2-column glass panel: copy on the left (eyebrow pill with pulsing accent dot, large weight-800 heading, subtext, primary CTA with sliding `→` arrow + optional secondary text link) and a 2x2 stats grid on the right (gradient-text values, accent-bar prefixes). The variant uses the `secondaryCta` and `stats` JSON fields (variants A/B/C ignore both); when stats is absent, the component falls back to a sensible default set. Theme-aware across vibrant / dark / bright modes and across `data-sec-theme="primary"` (where the card flips to a deep-green chrome on the lime field). Reduced-motion users get the same composition with the BG zoom, dot pulse, hover lifts, and arrow nudges all stripped.
- **E (Process)** — extends Spotlight (D) with an inline numbered process list inside the copy column. The card is a 12-col grid: cols 1–7 hold eyebrow + heading + subtext + numbered `<ol>` of 3–6 steps (each row: large outlined numeral, title, optional body); cols 8–12 hold the same 2x2 stats panel as D; the CTA spans full-width at the bottom. Stats with a leading numeric run animate via count-up on intersection (easeOut, ~900ms); step rows reveal with an 80ms stagger. Use this variant when the section needs to *substantively* communicate a workflow rather than just gesture at one — the spotlight that earns its real estate. Reduced-motion users get the rest state painted instantly.

### Two ways to set the variant

The variant can be applied two ways, and brand CSS must handle **both** selector forms:

1. **Site-wide** via the editor's variant chip → sets `html[data-design-break-variant="X"]`. Stored in `localStorage['aed:design-break-variant']` and re-applied pre-paint by `Base.astro`. Brand default also lives here, defined in `brand.json` → `defaultVariants["design-break"]`.
2. **Per-section** via the JSON `variant` field → emits `data-design-break-variant` directly on the `.design-break` element. This pins one specific section regardless of the site-wide setting — useful when you want one section to showcase a different variant than the rest of the brand (the flinthills demo's "Same crew" design-break uses this to show D while the rest of the brand stays on the default).

Brand CSS should match both forms with a comma-separated selector pair:

```css
[data-design-break-variant='D'] .design-break,
.design-break[data-design-break-variant='D'] {
  /* variant D rules */
}
```

Both selectors are specificity (0,2,0). When both attrs are set with different values (e.g., html=B, section=D), source order resolves the conflict: whichever variant block appears later in the brand CSS wins.

## Theme / mode awareness

The section participates in section-overrides via `data-sec-theme`:

- `data-sec-theme="primary"` — lime brand surface, dark green text, white CTA.
- `data-sec-theme="light"` / `"white"` — light surface, dark text, lime CTA.
- `data-sec-theme="dark"` / `"black"` — explicit solid dark band (no image).
- _(no sec-theme)_ — image-with-overlay default in vibrant/dark mode; auto-flips to a light treatment in bright mode (`html[data-theme="light"]`).

## Behavior notes

- **No client-side JS.** Purely declarative.
- **Accessibility:** `design-break__overlay` carries `aria-hidden="true"`. The component uses a single `<h2>` — safe on any page that already has an `<h1>` elsewhere. The CTA is an ordinary `<a>`, so link semantics and keyboard nav are native.
- **Responsive images:** `backgroundImage` is applied to a dedicated `.design-break__bg` layer via the `--design-break-bg-image` custom property. No `<picture>` / `srcset`. Use a URL that's already reasonably sized (e.g., `?w=1920&q=75` from a CDN) — the browser can't pick a variant for you here.
- **Parallax:** the dedicated `.design-break__bg` layer is positioned with negative top/bottom inset so brand CSS can transform it on scroll (true parallax via `animation-timeline: view()`). Brands that don't want parallax can just style the layer statically.
- **Overlay:** the empty `design-break__overlay` div is a hook for per-brand dark/gradient overlays to ensure heading contrast over arbitrary images. Target it in brand CSS (`background: linear-gradient(...)` or similar). Overlay sits at `z-index: -1`, parallax bg layer sits at `z-index: -2`.

## Brand override hints

```css
.design-break {
  /* sizing, min-height, padding */
}
.design-break[data-has-bg='false'] {
  /* fallback gradient when no backgroundImage is set */
  background: linear-gradient(135deg, var(--brand-accent), var(--brand-accent-2));
}
.design-break__overlay {
  /* dim the image for contrast */
  background: linear-gradient(180deg, rgba(0,0,0,.1), rgba(0,0,0,.55));
}
.design-break__inner { /* max-width, centering, alignment */ }
.design-break__heading { /* scale, weight, tracking */ }
.design-break__cta { /* button chrome */ }

.design-break[data-design-break-variant='B'] .design-break__inner {
  /* text left, CTA right layout */
}
```

Keep text contrast over the background — run `/contrast-audit <brand>` if you introduce a new background pattern.

## Example

See `content/_examples/sections.json` → `designBreak`.
