# Testimonials

Client quote band. Pulls entries from the brand's `testimonials.json` collection — or, for demo / one-off pages, accepts inline `items[]` so the brand-wide collection stays clean.

- **`type`:** `testimonials`
- **Component:** `Testimonials.astro`
- **Schema:** `testimonialsSection` in `src/content/config.ts`
- **Used by:** all four brands

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"testimonials"` |
| `sectionLabel` | yes | Eyebrow. |
| `heading` | yes | Section heading. Newlines OK — rendered with `white-space: pre-line`. |
| `subtext` | no | |
| `testimonialIds` | no | Array of ids matching entries in `testimonials.json`. **If omitted or empty, the section auto-includes all testimonials with `featured: true`.** |
| `items` | no | Inline `{ quote, authorName, authorRole?, authorInitials?, avatar? }[]`. **Takes precedence over `testimonialIds`.** Use this for demo pages or bespoke one-off quotes that shouldn't pollute the brand-wide `testimonials.json`. |
| `variant` | no | `"grid"`, `"carousel"`, or `"slider"` (defaults to `"grid"`). This is a **Zod-enforced variant field**, separate from `data-section-variants` letters. |

Note: Zod validates `variant` as `grid | carousel | slider`. The `data-section-variants` letters (A–G) add further visual treatments on top of whichever `variant` you picked — they are orthogonal, except that `G:Slider` requires `variant: "slider"` at author time to render the slider markup.

## Variants

Declared as `data-section-variants="a:Default,B:Plain,C:Carousel,D:Detailed,E:Editorial,F:Large,G:Slider"`.

- **A (Default)** — grid layout with subtle card chrome.
- **B (Plain)** — accent rail, bold pull quote, divider above author.
- **C (Carousel/Editorial list)** — hairline list (grid) or stripped marquee cards.
- **D (Detailed)** — author at top with large avatar, quote below.
- **E (Editorial)** — magazine-style, broadsheet single-column with serif italic.
- **F (Large/Polaroid)** — cream card with serif type and drop shadow.
- **G (Slider)** — polished one-at-a-time slider: prev/next, animated dots, autoplay with progress bar, keyboard nav, swipe, pause-on-hover/focus, IntersectionObserver-gated, `prefers-reduced-motion` aware. Requires `variant: "slider"` in JSON.

## Behavior notes

- **Responsive images:** avatars use `loading="lazy"`.
- **Cross-refs:** `testimonialIds` pointing at missing entries fail `validate-brand.mjs`.
- **Default behavior:** leaving `testimonialIds` off auto-grabs everything flagged `featured: true` — this is the pattern used across all four brands' homepages.

## Brand override hints

```css
.testimonials { }
.testimonials__grid { }
.testimonials__card { }
.testimonials[data-testimonials-variant='C'] { /* carousel track */ }
```

## Example

See `content/_examples/sections.json` → `testimonials`.
