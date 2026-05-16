# Sparkline — portable inline mini chart

A drop-in folder. Renders a tiny SVG line chart inline from a
comma-separated value list. Pure SVG, no dependencies, theme-aware
(uses brand `--accent` by default; auto-trend recolors green / red /
gray based on slope).

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `sparkline.css` | Line + area + dot color (per-trend variants). |
| `sparkline.js` | Value parsing, trend detection, SVG generation. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "sparkline": { "enabled": true } }
```

## Markup

```html
<!-- Just the line -->
<span data-aed-sparkline="3,7,12,8,15,20"></span>

<!-- With area fill + last-point dot -->
<span data-aed-sparkline="100,98,95,93,99,97"
      data-aed-sparkline-area
      data-aed-sparkline-dot></span>

<!-- Custom dimensions -->
<span data-aed-sparkline="1,2,3,4,5"
      data-aed-sparkline-w="120"
      data-aed-sparkline-h="28"></span>

<!-- Force a trend color (otherwise auto-detected from slope) -->
<span data-aed-sparkline="50,52,49,55,60" data-aed-trend="up"></span>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-sparkline` | required | Comma-separated numeric values |
| `data-aed-sparkline-w` | `80` | Width in px |
| `data-aed-sparkline-h` | `20` | Height in px |
| `data-aed-sparkline-area` | absent | Fill area under the line |
| `data-aed-sparkline-dot` | absent | Draw a dot at the last point |
| `data-aed-trend` | auto | Override line color: `up` (green) / `down` (red) / `flat` (gray). Auto-detected from first-to-last slope when absent. |

## Behavior

- **Pure SVG**: no canvas, no dependencies. Renders inline alongside
  text.
- **Auto-trend**: when no `data-aed-trend` attribute is set, the addon
  computes slope direction (up if last > first by ≥5% of range, down
  if reverse, flat otherwise).
- **Auto-aria-label**: stamps an accessible label listing the values.
- **Theme-aware**: line + area colors come from `--accent` (or the
  trend palette). Override per-element via inline `style` if needed.

## Public API

```js
window.__sparkline.refresh()      // re-scan after dynamic insert
window.__sparkline.render(el)     // render one element manually
```

## Versioning

`VERSION` constant lives at the top of `sparkline.js`.
