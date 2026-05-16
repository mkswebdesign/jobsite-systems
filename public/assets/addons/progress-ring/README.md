# Progress Ring — portable circular percent

A drop-in folder. `<div data-aed-ring="73">` becomes a small SVG ring
filled to 73%, with a label centered inside. Pure SVG, theme-aware
(brand `--accent`), trend-color overrides for green / red / amber.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `progress-ring.css` | Track + fill styling, transition, trend color overrides. Theme-aware. |
| `progress-ring.js` | Geometry math, SVG generation, animation from a configurable start value. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "progress-ring": { "enabled": true } }
```

## Markup

```html
<!-- Default 56px ring, 5px stroke, label = "73%" -->
<div data-aed-ring="73"></div>

<!-- Custom size, stroke, custom center label -->
<div data-aed-ring="92"
     data-aed-ring-size="80"
     data-aed-ring-stroke="6"
     data-aed-ring-label="A+"></div>

<!-- Different scale (e.g. score out of 50) -->
<div data-aed-ring="38" data-aed-ring-max="50"></div>

<!-- Trend color overrides -->
<div data-aed-ring="92" data-aed-trend="up"></div>
<div data-aed-ring="35" data-aed-trend="down"></div>
<div data-aed-ring="60" data-aed-trend="warn"></div>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-ring` | required | Current value |
| `data-aed-ring-max` | `100` | Upper bound for percent calculation |
| `data-aed-ring-size` | `56` | Diameter in px |
| `data-aed-ring-stroke` | `5` | Stroke width in px |
| `data-aed-ring-label` | rounded `%` | Center label override |
| `data-aed-ring-animate-from` | `0` | Initial value to animate from |
| `data-aed-trend` | (default accent) | `up` / `down` / `warn` color override |

## Behavior

- **Pure SVG**: no canvas, no library. Two `<circle>` elements (track
  + fill) with `stroke-dasharray` math. Fill starts at the configured
  `animate-from` value and animates to the real value on first paint.
- **Auto-aria-label**: SVG gets `aria-label="Progress: N%"` for screen
  readers.
- **Reduced motion**: animation transition disabled; ring jumps to
  final position.

## Public API

```js
window.__ring.refresh()         // re-scan after dynamic insert
window.__ring.set(el, value)    // update value + animate
```

## Versioning

`VERSION` constant lives at the top of `progress-ring.js`.
