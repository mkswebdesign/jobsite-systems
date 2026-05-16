# PhotoSlider

Auto-advancing photo slider with four visual modes — single-photo-at-a-time hero cinema (variant A), continuous-scroll marquee carousel (variant B), ultra-thin carousel strip (variant C), or full-bleed slim marquee (variant D). Distinct from PhotoGallery (multi-photo grid/masonry/scroll-strip catalog browsing).

- **`type`:** `photoSlider`
- **Component:** `PhotoSlider.astro`
- **Schema:** `photoSliderSection` in `src/content/config.ts`
- **Used by:** demo / not yet adopted by a shipping brand.

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"photoSlider"` |
| `images` | yes | Array of 2–48 `{ src, alt?, caption? }` items. Items missing `src` are filtered at render time. |
| `heading` | no | Optional heading above the slider. |
| `sectionLabel` | no | Optional 1–3 word eyebrow above the heading. |
| `subtext` | no | Optional one-line context line under the heading. |
| `cta` | no | `{ label, href }`. Optional. |
| `variant` | no | `A` (Default fade), `B` (Carousel marquee), `C` (Carousel Slim), or `D` (Carousel Slim Full). Defaults to `A`. |
| `autoplay` | no | Boolean, defaults to `true`. Variant A only — set `false` to disable auto-advance. (Variant B is always running unless paused by hover/offscreen/reduced-motion.) |
| `interval` | no | Variant A auto-advance interval in ms. Range 1500–20000. Defaults to 5000. (No effect on variant B; its cycle scales with slide count.) |

## Editor wiring

Root element declares:
- `data-section-type="photo-slider"`
- `data-section-label="Photo slider"`
- `data-section-variants="A:Default,B:Carousel,C:Carousel Slim,D:Carousel Slim Full"`

Runtime attributes (`data-autoplay`, `data-interval`) drive the inline-script behavior — they're not editor-facing.

## Variants

Declared on root as `data-section-variants="A:Default,B:Carousel,C:Carousel Slim,D:Carousel Slim Full"`.

- **A (Default)** — single visible slide, fade transition, prev/next arrow buttons, dot pagination, swipe gestures. Hero-style cinema where one photo holds the stage at a time.
- **B (Carousel)** — continuous-scroll horizontal marquee, multiple slides visible at once, slow auto-scroll, hover/focus pauses the strip. Click any slide to open the lightbox. Slides are cloned at runtime so the loop is seamless; clones are excluded from the lightbox group via `data-aed-lightbox="off"`. Animation duration scales with slide count (~3.5s per slide, floor 30s).
- **C (Carousel Slim)** — same carousel behavior as B with a stripped-down section frame: `padding-top` / `padding-bottom` collapse to `1px` and `margin-top` / `margin-bottom` to `0`. Renders as an ultra-thin marquee strip useful as a divider-weight visual between heavier authored sections.
- **D (Carousel Slim Full)** — same as C (slim) but the inner container breaks out of the brand max-width gutter so the marquee stretches edge-to-edge across the viewport. Useful when the carousel should feel like a banner band rather than a contained section. Viewport `border-radius` collapses to `0` for a clean rectangular full-bleed.

CSS uses `:is(B, C, D)` selector lists to share carousel behavior across all three, with C-only overrides isolated to the slim section frame and D-only overrides isolated to the full-bleed inner container.

Variant attr is set on `<html>` (e.g. `html[data-photo-slider-variant="B"]`) when chosen via the chip picker site-wide / per-page, or directly on the section element for per-instance pins. CSS uses dual-form selectors so all three scopes resolve correctly.

## Behavior notes

### Variant A (Default)
- **Auto-advance** is on by default, paused on hover, focus-within, and when the section scrolls offscreen (IntersectionObserver). Fully suppressed under `prefers-reduced-motion`.
- **Keyboard nav** — focusable viewport (`tabindex="0"`); ←/→ when focused advance prev/next.
- **Touch swipe** — horizontal swipes >40px advance ±1 slide. Vertical scroll passes through.
- **Cross-fade transition** — slides stack in absolute position; opacity transitions between them. Skip the transition entirely when `prefers-reduced-motion: reduce`.

### Variant B (Carousel)
- **Continuous CSS marquee** — track translateX(0 → -50%) infinitely; the second half is a cloned copy of the first so the loop is invisible to the eye.
- **Hover/focus pause** — pure CSS via `:hover` / `:focus-within` on the viewport sets `animation-play-state: paused`.
- **Offscreen pause** — IntersectionObserver toggles `animationPlayState` so the marquee doesn't burn cycles when not visible.
- **Click-to-lightbox** — every slide image emits `data-aed-lightbox=""` + a stable per-instance group id. The image-lightbox addon (must be enabled in `site.json`) provides modal browsing with prev/next, keyboard nav, click-outside-to-close, and focus trap.
- **Reduced-motion fallback** — animation suppressed; track becomes a horizontal `overflow-x: auto` + `scroll-snap-type: x mandatory` strip so the user can pace themselves.
- **Edge fade gradients** — left/right edges fade to the surface color via `::before` / `::after` pseudo-elements so slides slide in/out softly rather than hard-cutting.

### Shared (both variants)
- **Lightbox** — every slide image has `data-aed-lightbox=""` + caption attr + a stable per-instance group id (`ps-XXXX` hashed from heading/sectionLabel/first src). Group id keeps prev/next scoped to this slider rather than bleeding across other galleries on the page.
- **Accessibility** — `role="region"` + `aria-roledescription="carousel"` on the viewport; each slide has `aria-roledescription="slide"` + `aria-label="Slide N of M"`; dots (variant A) use `aria-current="true"`. Variant A: off-slide images are `aria-hidden="true"`. Variant B: cloned slides are `aria-hidden="true"` so AT users only traverse the original set.
- **Performance** — first slide gets `loading="eager"`; remaining slides are `loading="lazy"` + `decoding="async"`. Variant B's clones inherit `loading="lazy"`.

## Section-overrides hooks

`Base.astro` may set the following before paint:
- `data-sec-theme` (light / dark / white / black / primary / secondary / vibrant)
- `data-sec-disabled` (`on`) — component already includes a `display: none` rule for this
- `data-sec-parallax-bg` (`on`) — component already pulls `var(--sec-parallax-url)` when set
- `--accent` / `--accent-rgb` CSS vars

## Brand override hints

```css
.photo-slider { /* padding, surface */ }
.photo-slider__inner { /* max-width, gap */ }
.photo-slider__viewport {
  aspect-ratio: 21 / 9;        /* widescreen for landscape brands */
  border-radius: 24px;
}
.photo-slider__caption {
  background: linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,0));
}
.photo-slider[data-sec-theme='light'] .photo-slider__viewport {
  background: var(--bg-card, #fff);
  box-shadow: 0 8px 24px rgba(0,0,0,.08);
}
```

## Example

See `content/_examples/sections.json` → `photoSlider`.
