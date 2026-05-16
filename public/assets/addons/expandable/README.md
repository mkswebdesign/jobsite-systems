# Expandable — portable line-clamp truncation

A drop-in folder. Truncates any `[data-aed-expand-after="N"]` element
to N lines, fades the bottom edge, and shows a "Read more" toggle.
Click expands, click "Read less" collapses.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `expandable.css` | Line-clamp + bottom mask-image fade + toggle button. Theme-aware. |
| `expandable.js` | Wrap children, measure content, attach toggle, skip when content already fits. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "expandable": { "enabled": true } }
```

## Markup

```html
<div data-aed-expand-after="6">
  <p>Long content...</p>
  <p>More content...</p>
</div>

<!-- Custom labels -->
<div data-aed-expand-after="4"
     data-aed-expand-more="Show more"
     data-aed-expand-less="Hide">
  ...
</div>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-expand-after` | required | Number of visible lines when collapsed |
| `data-aed-expand-more` | `"Read more"` | Toggle label when collapsed |
| `data-aed-expand-less` | `"Read less"` | Toggle label when expanded |

## Behavior

- **Children-wrap**: existing children are moved into an inner
  `.aed-exp-content` div so the toggle button can sit outside the
  clamped region.
- **Mask fade**: bottom edge fades to transparent for a softer cutoff.
- **Skip-if-short**: after the first paint, the addon measures content
  height. If it's already ≤ the clamped height, the toggle is never
  inserted (no useless button on a 2-line testimonial).
- **Print mode**: clamping + fade are forced off, toggle hidden, full
  content prints.

## Public API

```js
window.__expandable.refresh()
window.__expandable.expand(el)
window.__expandable.collapse(el)
```

## Versioning

`VERSION` constant lives at the top of `expandable.js`.
