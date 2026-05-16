# Services

Grid of service cards sourced from the brand's `services/` collection. Each card renders from a `services/<slug>.json` entry — so this section is a *reference* to collection items, not a duplicate of their content.

- **`type`:** `services`
- **Component:** `ServicesGrid.astro`
- **Schema:** `servicesSection` in `src/content/config.ts`
- **Used by:** all four brands

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"services"` |
| `sectionLabel` | yes | Eyebrow text above the heading. |
| `heading` | yes | Section heading. |
| `subtext` | no | One-line supporting sentence. |
| `serviceSlugs` | yes | Array of slug strings matching files in the brand's `services/` collection. Order is preserved. `validate-brand.mjs` will fail the build if a slug doesn't resolve. |

## Variants

Declared as `data-section-variants="A:Default,B:Listed,C:Gridded,D:Compact,E:Minimal,F:Featured"`.

- **A (Default)** — standard 2- or 3-column card grid.
- **B (Listed)** — denser list layout; good for many short services.
- **C (Gridded)** — stricter grid with consistent aspect ratios.
- **D (Compact)** — smaller cards, more per row.
- **E (Minimal)** — icons + headings only, no card chrome. Implemented in `landscape-systems` CSS.
- **F (Featured)** — first card is highlighted, others smaller. Implemented in `landscape-systems` CSS (vibrant theme only).

## Behavior notes

- **Responsive images:** first service card's `heroImage` is eager-loaded; others are `loading="lazy"`.
- **Dependencies:** fetches `services` collection; renders through `SectionHeading` + inline `Icon` components.
- **Dead refs:** a slug in `serviceSlugs` that doesn't exist in the collection breaks the build. Run `validate-brand` to catch before ship.

## Brand override hints

```css
.services { }
.services__grid { grid-template-columns: ...; }
.services__card { }
.services[data-services-variant='F'] .services__card:first-child { /* feature treatment */ }
```

## Example

See `content/_examples/sections.json` → `services`.
