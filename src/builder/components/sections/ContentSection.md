# ContentSection

Text-only editorial content block — no images, no decorative chrome. Pairs with DesignBreak the way an article paragraph pairs with a section break: DesignBreak is the visual breath, ContentSection is the room. Use it for prose, case studies, essays, explainers — anywhere the page needs typography to do the work.

- **`type`:** `contentSection`
- **Component:** `ContentSection.astro`
- **Schema:** `contentSectionSection` in `src/content/config.ts`
- **Used by:** demo / not yet adopted by a shipping brand.

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"contentSection"` |
| `heading` | yes | Section heading. Brand-voice declarative — this is the topic of the block. |
| `body` | yes | Single string OR array of strings. Each string becomes a `<p>`. 1–4 paragraphs read strongest. |
| `cta` | no | `{ label, href }`. Optional — many editorial blocks read better without one. |
| `sectionLabel` | no | Optional 1–3 word eyebrow above the heading. |
| `variant` | no | `A` / `B` / `C` / `D` / `E` — see Variants. Defaults to `A`. |
| `indexNum` | no | Stage-only (E). Monospace number in the index marker (e.g. `"02"`). |
| `comparison` | no | Stage-only (E). Two-column build comparison: `{ left, right }`, each `{ tag, num, unit, items[] }` (1–8 chips). `right.accent: true` tints the winning numeral. |
| `statementTag` | no | Stage-only (E). Italic muted suffix appended to the statement paragraph. |
| `railMeta` | no | Stage-only (E). Uppercase monospace meta line opposite the rail CTA (e.g. pricing teaser). |

## Editor wiring

Root element declares:
- `data-section-type="content-section"` (editor identity / CHIP-LBL key)
- `data-section-label="Content section"` (CHIP-LBL display name)
- `data-section-variants="A:Standard,B:Centered,C:Editorial"` (variant picker)

Participates in the section-overrides system — `Base.astro` applies `data-sec-theme`, `data-sec-disabled`, and `--accent` CSS vars. Per-brand CSS should respect these.

## Variants

Declared on root as `data-section-variants="A:Standard,B:Centered,C:Editorial"`.

- **A (Standard)** — single column, left-aligned with an accent rule on the heading. The default editorial treatment.
- **B (Centered)** — narrow centered column, larger heading. For statement pieces.
- **C (Editorial)** — magazine-style two-column layout (heading left, body right). Strong typographic rhythm; needs ≥2 paragraphs to balance.
- **D (Spotlight)** — accent-tinted head card with drop cap, animated entry, accent rule, halo drift, dot pulse, CTA sweep. Theme-aware; honors `prefers-reduced-motion`.
- **E (Stage)** — light-mode marketing block with monospace index marker, display headline (`*word*` markdown emphasis is rendered as a lime-highlighted span), two-column build-comparison panel with VS badge, italic-tagged statement, and a hairline footer rail with a forwarding CTA. Stays in light mode regardless of site theme. Activates Stage-only fields: `indexNum`, `comparison`, `statementTag`, `railMeta`. The `body` is rendered as a single statement paragraph.

Variant attr is set on `<html>` (e.g. `html[data-content-section-variant="B"]`), so per-brand CSS should select via a generic ancestor selector (`[data-content-section-variant='B'] .content-section__inner`).

## Theme / mode awareness

Participates in section-overrides via `data-sec-theme`:

- `data-sec-theme="primary"` — brand-primary surface, dark text.
- `data-sec-theme="light"` / `"white"` — light surface, dark text.
- `data-sec-theme="dark"` / `"black"` — dark surface, light text.
- _(no sec-theme)_ — inherits the current theme mode (vibrant / dark / bright).

## Behavior notes

- **No client-side JS.**
- **Accessibility:** `<h2>` heading — safe on any page with an `<h1>` elsewhere. Body wraps each input string in its own `<p>`, so screen readers get clean paragraph breaks.
- **Motion:** brand CSS can apply the canonical `aedSectionElEnter` keyframe to `.content-section__eyebrow`, `.content-section__heading`, `.content-section__body` on a scroll-driven view timeline. Animate the body container, not each `<p>`.

## Brand override hints

```css
.content-section { /* padding, surface */ }
.content-section__inner { /* max-width, gap */ }
.content-section__heading { /* scale, weight, tracking */ }
.content-section__body p { /* leading, measure */ }
.content-section__cta { /* button chrome */ }

[data-content-section-variant='C'] .content-section__inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: clamp(2rem, 6vw, 4rem);
}
```

Collapse to single column on narrow viewports.

## Example

See `content/_examples/sections.json` → `contentSection`.
