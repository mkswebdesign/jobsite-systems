# Section Divider — portable SVG transitions

A drop-in folder. Hydrates `[data-aed-divider="<shape>"]` placeholders
with one of five built-in SVG shapes (wave, tilt, arch, peaks, curve)
that visually transition between two sections of different background
colors. Works standalone between sections, or absolutely-positioned
inside a section anchored to top/bottom.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `section-divider.css` | Container, fill / height variables, top / bottom anchoring, flip variants. |
| `section-divider.js` | Built-in shape registry, render. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "section-divider": { "enabled": true } }
```

## Markup

```html
<!-- Between two sections (block in document flow) -->
<section style="background:var(--bg-secondary)">A</section>
<div data-aed-divider="wave"
     style="--aed-divider-fill:var(--bg-secondary);--aed-divider-h:80px"></div>
<section style="background:var(--bg-primary)">B</section>

<!-- Inside a section, anchored to its bottom -->
<section style="position:relative;background:var(--accent);padding-bottom:120px">
  ...
  <div data-aed-divider="curve"
       data-aed-position="bottom"
       style="--aed-divider-fill:var(--bg-primary)"></div>
</section>

<!-- Flipped variants (one shape, four orientations) -->
<div data-aed-divider="tilt" data-aed-flip-x="true"></div>
<div data-aed-divider="arch" data-aed-flip-y="true"></div>
```

## Shapes

| Token | Look |
|---|---|
| `wave` | Single sine wave |
| `tilt` | Diagonal slash |
| `arch` | One large arch |
| `peaks` | Polygonal mountain silhouette |
| `curve` | Subtle dipped curve |

(Use `__divider.shapes` in the console to see the list at runtime.)

## Per-element attributes / variables

| Attribute / variable | Default | Purpose |
|---|---|---|
| `data-aed-divider="<shape>"` | `wave` | Picks the shape |
| `data-aed-position` | (none) | `top` or `bottom` — absolute-positioned inside a `position:relative` parent |
| `data-aed-flip-x="true"` | absent | Horizontal mirror |
| `data-aed-flip-y="true"` | absent | Vertical mirror |
| `--aed-divider-h` | `60px` | Shape height |
| `--aed-divider-fill` | `var(--bg-primary)` | The shape's fill color (typically the next section's background) |

## Behavior

- **`preserveAspectRatio="none"`**: shapes stretch to the element's
  width, so they always fit edge-to-edge.
- **Aria-hidden**: divider markup is decorative and never announced.
- **Print mode**: hidden — printed pages don't need decorative
  transitions.

## Custom shapes

Add to `SHAPES` in `section-divider.js`:

```js
SHAPES.zigzag = '<svg xmlns="..." viewBox="0 0 1440 80" preserveAspectRatio="none">' +
  '<path d="M0,80 L120,20 L240,80 L360,20 L480,80 L600,20 L720,80 ...Z"/>' +
  '</svg>';
```

Then `<div data-aed-divider="zigzag">` works.

## Public API

```js
window.__divider.refresh()
window.__divider.shapes        // array of built-in shape names
window.__divider.svgFor(name)  // raw SVG markup for a shape
```

## Versioning

`VERSION` constant lives at the top of `section-divider.js`.
