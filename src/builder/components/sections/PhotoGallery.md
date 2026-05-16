# PhotoGallery

Multi-image showcase block — for project work, before/after photos, team shots, equipment galleries. Distinct from DesignBreak (single atmospheric image with copy) and ContentSection (text-only).

- **`type`:** `photoGallery`
- **Component:** `PhotoGallery.astro`
- **Schema:** `photoGallerySection` in `src/content/config.ts`
- **Used by:** demo / not yet adopted by a shipping brand.

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"photoGallery"` |
| `images` | yes | Array of 2–48 `{ src, alt?, caption? }` items. Items missing `src` are filtered out at render time. |
| `heading` | no | Optional heading above the grid. |
| `sectionLabel` | no | Optional 1–3 word eyebrow above the heading. |
| `subtext` | no | Optional one-line context line under the heading. |
| `cta` | no | `{ label, href }`. Optional. |
| `variant` | no | `A` / `B` / `C` — see Variants. Defaults to `A`. |
| `perPage` | no | Positive integer 1–24. When set and smaller than `images.length`, the gallery paginates with prev/next + numbered controls. All items still render in the DOM (so the image-lightbox addon can browse the full set seamlessly), but only one page is visible at a time. Omit or set to `0` to render all at once. |

## Editor wiring

Root element declares:
- `data-section-type="photo-gallery"`
- `data-section-label="Photo gallery"`
- `data-section-variants="A:Grid,B:Masonry,C:Carousel"`

Pagination attributes (`data-paged`, `data-per-page`, `data-page-count`) are emitted only when `perPage` triggers chunking — they're for runtime behavior, not editor wiring.

## Variants

Declared on root as `data-section-variants="A:Grid,B:Masonry,C:Carousel"`.

- **A (Grid)** — uniform aspect-ratio grid. Default. 3-up on tablet, 4-up on desktop.
- **B (Masonry)** — varied heights via CSS columns. Better for mixed-orientation photos where uniform aspect ratios crop badly.
- **C (Carousel)** — horizontal scroll-snap strip. Best when 6+ photos would otherwise dominate the page vertically.

Variant attr is set on `<html>` (e.g. `html[data-photo-gallery-variant="B"]`).

## Theme / mode awareness

Participates in section-overrides via `data-sec-theme`. Same surface palette as the editorial trio (DesignBreak / ContentSection / AboutSplit).

## Behavior notes

- **Lightbox integration:** images render with a stable per-instance group id (`data-lightbox-group="pg-…"`) hashed from heading + sectionLabel + first src. The image-lightbox addon (when enabled) uses that to scope prev/next within a single gallery rather than across all galleries on the page. Survives rebuilds without leaking content.
- **Pagination:** keeps every item in the DOM, hides off-page items via `data-hidden="true"` so the lightbox keeps full reach. Page state is client-side only — direct links land on page 1.
- **Accessibility:** images render in `<ul role="list">` with `<figure>` inside each `<li>`. `alt` defaults to `""` when omitted (treats the image as decorative). Pass real alt text when the image carries information that the caption / surrounding copy doesn't.
- **Performance:** every `<img>` ships with `loading="lazy"` and `decoding="async"`. Use a CDN URL pre-sized for the largest expected render width.

## Brand override hints

```css
.photo-gallery { /* padding, surface */ }
.photo-gallery__inner { /* max-width, gap */ }
.photo-gallery__body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: clamp(0.75rem, 2vw, 1.5rem);
}
.photo-gallery__figure { aspect-ratio: 4 / 3; }
.photo-gallery__img { width: 100%; height: 100%; object-fit: cover; }

[data-photo-gallery-variant='B'] .photo-gallery__body {
  display: block;
  column-count: 3;
  column-gap: 1rem;
}
[data-photo-gallery-variant='B'] .photo-gallery__figure { aspect-ratio: auto; break-inside: avoid; }

[data-photo-gallery-variant='C'] .photo-gallery__body {
  grid-auto-flow: column;
  grid-auto-columns: minmax(280px, 1fr);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}
```

## Example

See `content/_examples/sections.json` → `photoGallery`.
