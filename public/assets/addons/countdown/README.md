# Countdown — portable tick-down to a target

A drop-in folder. Hydrates `[data-aed-countdown="<ISO>"]` elements with
a live tick-down to the target datetime. Two surfaces: inline string
("in 5d 12h 30m") and a discrete-cell card.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `countdown.css` | Card layout, cell styling, accent variant. Theme-aware. |
| `countdown.js` | Adaptive tick (1s under 1 min, 1 min otherwise), visibility pause, expiry handling. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "countdown": { "enabled": true } }
```

Drop elements where you need them:

```html
<!-- Inline string -->
<span data-aed-countdown="2026-05-15T17:00:00Z"></span>

<!-- Card variant: 4 cells (days / hours / minutes / seconds) -->
<div data-aed-countdown="2026-05-15T17:00:00Z" data-aed-cd-card></div>

<!-- Card with accent gradient background -->
<div data-aed-countdown="2026-05-15T17:00:00Z"
     data-aed-cd-card
     data-aed-cd-variant="accent"></div>

<!-- Custom expired text -->
<span data-aed-countdown="2026-05-15T17:00:00Z"
      data-aed-cd-expired="It's live!"></span>

<!-- Hide entirely after expiry -->
<span data-aed-countdown="2026-05-15T17:00:00Z"
      data-aed-cd-hide-on-expire></span>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-countdown` | required | Target datetime (any value `Date.parse()` accepts) |
| `data-aed-cd-card` | absent | Render as 4-cell card instead of inline |
| `data-aed-cd-variant` | (default) | `accent` for brand-gradient card background |
| `data-aed-cd-expired` | `"Now"` | Text shown after the target passes |
| `data-aed-cd-hide-on-expire` | absent | Hide the element entirely after expiry |

## Behavior

- **Adaptive ticking**: 1-second updates while within the final minute,
  1-minute updates otherwise. Cuts CPU dramatically for distant targets.
- **Visibility-aware**: pauses when tab hidden, catches up on return.
- **Expiry**: stops re-rendering once expired. Custom `data-aed-cd-expired`
  text is set, or the element is hidden if `data-aed-cd-hide-on-expire`.
- **Print mode**: card background becomes transparent.

## Public API

```js
window.__countdown.refresh()          // re-scan + re-render
window.__countdown.parts('2026-05-15T17:00:00Z')
// → { days, hours, minutes, seconds, expired, ms }
```

## Versioning

`VERSION` constant lives at the top of `countdown.js`.
