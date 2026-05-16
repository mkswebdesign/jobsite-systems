# Copy Input — portable input with one-click copy

A drop-in folder. Wraps any `<input data-aed-copy>` with a Copy button.
Click to copy the input's `value` to the clipboard with visual
feedback. Perfect for share links with UTMs, promo codes, API keys,
"copy your link" patterns.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `copy-input.css` | Container, focus ring, button states (idle / copied). Theme-aware. |
| `copy-input.js` | Wrap, clipboard with execCommand fallback, copied-state animation. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "copy-input": { "enabled": true } }
```

## Markup

```html
<!-- Simplest: a readonly input -->
<input data-aed-copy value="https://gomks.com/?ref=anthony" readonly>

<!-- Custom labels -->
<input data-aed-copy value="GOMKS-LAUNCH-50" readonly
       data-aed-copy-label="Copy code"
       data-aed-copy-copied-label="✓ Copied">

<!-- Select all on focus (helpful for keyboard users) -->
<input data-aed-copy value="anthony@mkswebdesign.com" readonly
       data-aed-copy-select-on-focus>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-copy` | required | Opt-in marker |
| `data-aed-copy-label` | `Copy` | Button label idle |
| `data-aed-copy-copied-label` | `Copied` | Button label after copy |
| `data-aed-copy-select-on-focus` | absent | Auto-select all text on focus |

## Behavior

- **Native input preserved**: the addon wraps but never replaces the
  `<input>`. Forms / value reads / change events all work as authored.
- **Clipboard fallback**: uses `navigator.clipboard.writeText()` with
  hidden-textarea + `execCommand('copy')` for older browsers.
- **Visual feedback**: button border + icon turn green and label
  flips to "Copied" for 1.5s.
- **Focus ring**: brand-accent halo on `:focus-within`.
- **Print mode**: button hidden, container border removed.

## Public API

```js
window.__copyInput.refresh()        // re-scan after dynamic insert
window.__copyInput.copy(input)      // programmatic copy + flash
```

## Versioning

`VERSION` constant lives at the top of `copy-input.js`.
