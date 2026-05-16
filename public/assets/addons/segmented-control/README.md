# Segmented Control — portable toggle group

A drop-in folder. Wraps a row of `<button>` children of any
`[data-aed-segmented]` container in an iOS-style segmented control with
a sliding thumb. Fires `aed:segmented:change` events for any code that
wants to react.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `segmented-control.css` | Pill container, button states, animated thumb, compact + ghost variants. Theme-aware. |
| `segmented-control.js` | Selection state, thumb position math, change events, name registry. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "segmented-control": { "enabled": true } }
```

## Markup

```html
<div data-aed-segmented data-aed-segmented-name="billing">
  <button data-aed-value="annual" data-aed-default>Annual</button>
  <button data-aed-value="monthly">Monthly</button>
</div>

<!-- Compact -->
<div data-aed-segmented data-aed-segmented-name="view"
     data-aed-variant="compact">
  <button data-aed-value="grid" data-aed-default>Grid</button>
  <button data-aed-value="list">List</button>
  <button data-aed-value="board">Board</button>
</div>

<!-- Ghost (no border / background until active thumb) -->
<div data-aed-segmented data-aed-segmented-name="period" data-aed-variant="ghost">
  <button data-aed-value="day" data-aed-default>Day</button>
  <button data-aed-value="week">Week</button>
  <button data-aed-value="month">Month</button>
</div>
```

## Per-container / per-button attributes

| Attribute | Purpose |
|---|---|
| `data-aed-segmented` | (required) marks the container |
| `data-aed-segmented-name` | name used in events + `__segmented.get/set(name, value)` |
| `data-aed-variant` | `compact` (smaller padding) / `ghost` (transparent shell) |
| `data-aed-value` | (required, on each button) value emitted on selection |
| `data-aed-default` | marks the initially-active button (first button if none) |

## Events

```js
document.addEventListener('aed:segmented:change', (e) => {
  // e.detail.name      → "billing"
  // e.detail.value     → "monthly"
  // e.detail.previous  → "annual"
});
```

The event bubbles, so you can listen on `document` or any parent.

## Public API

```js
window.__segmented.set('billing', 'monthly')   // selects + fires change
window.__segmented.get('billing')              // → 'monthly'
window.__segmented.refresh()                   // re-scan
```

## Behavior

- **Sliding thumb**: a single `<span class="aed-seg-thumb">` element
  positioned absolutely; left + width animate to match the active
  button's rect.
- **A11y**: container = `role="tablist"`, buttons = `role="tab"`,
  `aria-pressed` toggled per state.
- **Resize-safe**: re-measures the thumb on window resize.
- **Reduced motion**: thumb transition disabled.
- **Print mode**: thumb hidden; active button gets an underline so
  state is visible in ink.

## Versioning

`VERSION` constant lives at the top of `segmented-control.js`.
