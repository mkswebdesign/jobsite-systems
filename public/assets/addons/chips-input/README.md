# Chips Input — portable tag/chip multi-value field

A drop-in folder. Wraps any opted-in `<input type="text"
data-aed-chips>` into a chip-aware field. Type, comma-or-Enter to
commit, X to remove. Backspace on an empty entry removes the last
chip. Native input is kept as the backing storage (comma-joined value)
so forms work as authored.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `chips-input.css` | Container, chip pill, entry field, focus ring, error banner. Theme-aware. |
| `chips-input.js` | Chip add/remove, paste-multiple, datalist allowed-values support, strict mode. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "chips-input": { "enabled": true } }
```

## Markup

```html
<!-- Basic -->
<input type="text" data-aed-chips name="services"
       placeholder="Type a service, press Enter">

<!-- Pre-filled from comma-separated value -->
<input type="text" data-aed-chips name="cities"
       value="Austin, Round Rock, Cedar Park">

<!-- Suggestions via <datalist> (built from data-aed-chips-allowed) -->
<input type="text" data-aed-chips name="skills"
       data-aed-chips-allowed="HTML, CSS, JS, Astro, Vue, React, Svelte">

<!-- Strict: only allowed values accepted -->
<input type="text" data-aed-chips name="status"
       data-aed-chips-allowed="active, paused, archived"
       data-aed-chips-strict>

<!-- Max count -->
<input type="text" data-aed-chips name="tags"
       data-aed-chips-max="5">
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-chips` | required | Opt-in marker |
| `data-aed-chips-allowed` | absent | Comma-separated whitelist; surfaces in a `<datalist>` |
| `data-aed-chips-strict` | absent | Reject values not in the allowed list |
| `data-aed-chips-max` | `0` (no limit) | Max chip count |
| `data-aed-chips-separator` | `,` | Character that commits the entry (Enter always commits) |

## Behavior

- **Backing storage**: the original `<input>` is hidden and its
  `value` is kept as the comma-joined chip list. Forms post a single
  string — split on `,` server-side.
- **Paste support**: pasting a multi-value string (newline- or
  comma-separated) splits and adds each as a chip.
- **De-dupe**: case-insensitive — `"Austin"` and `"austin"` collapse.
- **Backspace remove**: pressing Backspace on an empty entry removes
  the most recent chip.
- **Click container = focus entry**: empty space inside the container
  focuses the entry input.
- **Inline errors**: failed validation (strict, max) surfaces a brief
  inline message below the chips.
- **A11y**: chips have `data-aed-chip-value` for testability; remove
  buttons get `aria-label="Remove <value>"`. Entry inherits the
  original input's `aria-label` / `placeholder`.

## Public API

```js
window.__chips.refresh()              // re-scan after dynamic insert
window.__chips.values(input)          // → string[] of current chips
```

## Versioning

`VERSION` constant lives at the top of `chips-input.js`.
