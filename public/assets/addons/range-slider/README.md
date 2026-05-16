# Range Slider — portable styled `<input type="range">`

A drop-in folder. Wraps any opted-in native range input in a themed
container with cross-browser track/fill/thumb styles and a live value
badge that floats above the thumb. Native input keeps full
accessibility + form integration.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `range-slider.css` | WebKit + Firefox track/thumb styling, badge + arrow, focus ring. Theme-aware. |
| `range-slider.js` | Wrap, percent → CSS variable, badge position math, formatted value. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "range-slider": { "enabled": true } }
```

## Markup

```html
<input type="range" data-aed-range min="0" max="100" value="50">

<!-- $ prefix + thousands separator -->
<input type="range" data-aed-range
       min="0" max="2500" step="100" value="500"
       data-aed-range-prefix="$"
       data-aed-range-format="thousands">

<!-- Percent suffix -->
<input type="range" data-aed-range min="0" max="100" value="73"
       data-aed-range-suffix="%">

<!-- Hide the badge -->
<input type="range" data-aed-range data-aed-range-no-badge>

<!-- Show min/max labels under the track -->
<input type="range" data-aed-range data-aed-range-foot
       min="0" max="100" value="50">
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-range` | required | Opt-in marker |
| `data-aed-range-prefix` | `""` | Text before value (e.g. `$`) |
| `data-aed-range-suffix` | `""` | Text after value (e.g. `%`) |
| `data-aed-range-decimals` | `0` | Decimal places |
| `data-aed-range-format` | `""` | `thousands` adds comma separators |
| `data-aed-range-no-badge` | absent | Hide the floating value badge |
| `data-aed-range-foot` | absent | Show min/max labels below the track |

## Behavior

- **Native input preserved**: the addon wraps but never replaces the
  `<input>`. Forms, validation, screen readers, keyboard control all
  work as authored.
- **Cross-browser styling**: WebKit uses a gradient track (`pct%
  accent`, rest border); Firefox uses the native `progress` element.
  Both get a 18px white circular thumb with brand-accent border.
- **Live badge**: floats above the thumb, follows during drag. Skips
  rendering when `data-aed-range-no-badge` is set.
- **Focus ring**: brand-accent halo on `:focus-visible`.
- **Reduced motion**: thumb scale-on-active disabled.
- **Print mode**: input + badge hidden.

## Public API

```js
window.__range.refresh()             // re-scan after dynamic insert
window.__range.format(input, value)  // format a value the way the input would
```

## Versioning

`VERSION` constant lives at the top of `range-slider.js`.
