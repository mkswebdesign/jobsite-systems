# Marquee — portable scrolling row

A drop-in folder. Wraps the children of any `[data-aed-marquee]`
container in a continuously-scrolling track. CSS handles the animation;
JS just clones children once so the loop is seamless. Theme-aware,
respects `prefers-reduced-motion` (becomes a manual scroll-snap row).

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `marquee.css` | Track animation, edge fade-mask, logo variant, reduced-motion fallback. |
| `marquee.js` | Children → track wrap, single duplicate clone, attribute → CSS variable mapping. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "marquee": { "enabled": true } }
```

Author markup:

```html
<!-- Text row -->
<div data-aed-marquee>
  <span>Static Compiled</span>
  <span>CDN Delivered</span>
  <span>Sub-Second Page Loads</span>
  <span>Core Web Vitals: Green</span>
</div>

<!-- Logo row, slower, right-to-left, pause on hover -->
<div data-aed-marquee
     data-aed-variant="logos"
     data-aed-direction="right"
     data-aed-speed="60"
     data-aed-pause-on-hover>
  <img src="/logos/a.svg" alt="Acme">
  <img src="/logos/b.svg" alt="Beta">
  <img src="/logos/c.svg" alt="Cygnus">
</div>
```

## Per-container attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-marquee` | required | Marks the container |
| `data-aed-direction` | `left` | `left` or `right` |
| `data-aed-speed` | `40` | Seconds for one full loop. Higher = slower. |
| `data-aed-gap` | `2.5rem` | Gap between items (any CSS length) |
| `data-aed-variant` | (default) | `logos` for image-friendly defaults (32px height, 0.7 opacity, hover full) |
| `data-aed-pause-on-hover` | absent | Pause the scroll while pointer is over the row |

## Behavior

- **CSS-driven loop**: `translateX(0)` → `translateX(-50%)` over the
  configured duration, infinite + linear.
- **Seamless**: JS duplicates children once. The animation lands at
  exactly the start of the duplicated set, so the visual loop is
  continuous.
- **Edge fade**: a CSS mask softens the left/right edges so items
  don't pop in/out abruptly.
- **A11y**: cloned children are tagged `aria-hidden="true"` so screen
  readers only see the originals.
- **Reduced motion**: animation disabled, container becomes a normal
  horizontal scroll area (manual control).
- **Print mode**: animation off, mask off, items print as a static row.

## Public API

```js
window.__marquee.refresh()   // rebuild all marquees after dynamic insert
```

## Versioning

`VERSION` constant lives at the top of `marquee.js`.
