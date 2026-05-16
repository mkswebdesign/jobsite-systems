# Before/After — portable image comparison slider

A drop-in folder. Wraps two `<img>` children of any
`[data-aed-before-after]` container in a draggable comparison slider.
Drag the divider, or focus it and use arrow keys, to reveal more of
the second image over the first.

Built for case studies showing site rebuilds, design refreshes, and
similar transformations.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `before-after.css` | Container, image stacking, divider + handle, optional corner labels. Theme-aware. |
| `before-after.js` | Drag (mouse + touch) + keyboard (arrows / Home / End) interaction, percentage state via CSS variable. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "before-after": { "enabled": true } }
```

## Markup

```html
<div data-aed-before-after data-aed-ba-start="50">
  <img src="/work/site-before.jpg" alt="Before — old marketing site">
  <img src="/work/site-after.jpg"  alt="After — rebuilt with the productized service">
  <span data-aed-ba-label="before">Before</span>
  <span data-aed-ba-label="after">After</span>
</div>
```

The first `<img>` is treated as "before," the second as "after."
Optional `<span data-aed-ba-label="before|after">` children become
corner labels.

## Per-container attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-before-after` | required | Marks the container |
| `data-aed-ba-start` | `50` | Initial divider position 0–100 |

## Behavior

- **Drag**: mousedown/touchstart anywhere on the image moves the
  divider to that horizontal position. Released anywhere on the page.
- **Keyboard**: focus the divider (Tab), then ←/→ (2% steps),
  shift+←/→ (10% steps), Home / End (0 / 100).
- **A11y**: divider has `role="slider"`, `aria-valuemin/max/now`. The
  container has `role="img"` and a default `aria-label`.
- **Print mode**: divider + handle hidden; both images print
  side-by-side at full reveal.

## Public API

```js
window.__beforeAfter.refresh()       // re-scan after dynamic insert
window.__beforeAfter.set(el, 75)     // set divider to 75%
```

## Versioning

`VERSION` constant lives at the top of `before-after.js`.
