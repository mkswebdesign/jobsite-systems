# Color Picker — portable styled `<input type="color">` + hex

A drop-in folder. Wraps any opted-in `<input type="color"
data-aed-color>` with a styled container: click-to-pick swatch +
visible hex input that syncs both ways. Native input is kept as the
canonical form value source.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `color-picker.css` | Container, swatch (with checkerboard for transparency), hex input. Theme-aware. |
| `color-picker.js` | Two-way swatch ↔ hex sync, value normalization, invalid feedback. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "color-picker": { "enabled": true } }
```

## Markup

```html
<input type="color" data-aed-color name="brand" value="#6B00FF">

<!-- Inside a form — submitted value is the canonical hex -->
<form>
  <label>Accent <input type="color" data-aed-color name="accent" value="#10B981"></label>
  <button type="submit">Save</button>
</form>
```

## Behavior

- **Two-way sync**: typing in the hex field updates the native picker
  (and vice versa). Form posts whatever the native input has.
- **Hex parsing**: accepts `#RGB`, `#RRGGBB`, with or without leading
  `#`. Invalid input flashes red on the hex field; blur snaps back to
  the last valid value.
- **Native picker preserved**: clicking the swatch opens the OS color
  dialog as expected.
- **Focus ring**: brand-accent halo on `:focus-within`.
- **Reduced motion**: container transition disabled.

## Public API

```js
window.__color.refresh()              // re-scan after dynamic insert
window.__color.set(input, '#6B00FF')  // programmatic set + sync + change event
window.__color.normalize('6b00ff')    // → '#6b00ff' or null if invalid
```

## Versioning

`VERSION` constant lives at the top of `color-picker.js`.
