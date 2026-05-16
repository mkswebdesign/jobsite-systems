# Gauge — portable half-circle arc

A drop-in folder. `<div data-aed-gauge="73">` becomes an SVG
half-circle arc filled to 73%, with a label centered below the arc.
Companion to `/progress-ring/`: same vocab + idea, different shape.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `gauge.css` | Track + fill styling, label positioning, trend color overrides. Theme-aware. |
| `gauge.js` | Half-circle arc geometry, SVG generation, animation. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "gauge": { "enabled": true } }
```

## Markup

```html
<!-- Default 100px gauge -->
<div data-aed-gauge="73"></div>

<!-- Different scale + suffix -->
<div data-aed-gauge="38" data-aed-gauge-max="50"
     data-aed-gauge-suffix="of 50"></div>

<!-- Larger, custom label -->
<div data-aed-gauge="92"
     data-aed-gauge-size="140"
     data-aed-gauge-stroke="10"
     data-aed-gauge-label="A+"
     data-aed-gauge-suffix="grade"
     data-aed-trend="up"></div>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-gauge` | required | Value |
| `data-aed-gauge-max` | `100` | Upper bound for percent calc |
| `data-aed-gauge-size` | `100` | Diameter in px (height ≈ size / 2) |
| `data-aed-gauge-stroke` | `8` | Stroke width in px |
| `data-aed-gauge-label` | rounded `%` | Center value override |
| `data-aed-gauge-suffix` | `""` | Small uppercase suffix below the value |
| `data-aed-trend` | (default accent) | `up` / `down` / `warn` color override |

## Behavior

- **Pure SVG**: a single `<path>` arc, drawn left → right across the
  top half. `stroke-dasharray` = full half-circumference; `stroke-dashoffset`
  animates from full (empty) to (1 − pct) × circumference.
- **Auto-aria-label**: SVG gets `aria-label="Gauge: N%"` for screen
  readers.
- **Reduced motion**: animation transition disabled.

## Pairs with `/progress-ring/`

Same vocab and patterns; different shape. Use a ring for
self-contained percentages (a Pomodoro timer, a download); use a
gauge for "this is the score" or "this is how full" displays.

## Public API

```js
window.__gauge.refresh()         // re-scan after dynamic insert
window.__gauge.set(el, value)    // update value + animate
```

## Versioning

`VERSION` constant lives at the top of `gauge.js`.
