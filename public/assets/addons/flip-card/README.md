# Flip Card — portable 3D flip card

A drop-in folder. Wraps two children of `[data-aed-flip]` (a front and
a back) in a 3D-transformed card that flips on hover or click. Useful
for "before/after the team" layouts, team bios with extra detail,
short challenge → answer reveals.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `flip-card.css` | 3D perspective + face stacking + flip transition + axis variants. Theme-aware. |
| `flip-card.js` | Wrap children, attach trigger handler, keyboard support for click mode. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "flip-card": { "enabled": true } }
```

## Markup

```html
<div data-aed-flip>
  <div data-aed-flip-front>
    <h3>Anthony Richter</h3>
    <p>Design Lead</p>
  </div>
  <div data-aed-flip-back>
    <p>20 years in design. Builds productized website services so small
       businesses don't have to learn a CMS.</p>
  </div>
</div>

<!-- Click to flip + vertical axis -->
<div data-aed-flip data-aed-flip-trigger="click" data-aed-flip-axis="x">
  <div data-aed-flip-front>Question</div>
  <div data-aed-flip-back>Answer</div>
</div>
```

The two children **must** have `data-aed-flip-front` and
`data-aed-flip-back` attributes. The addon adds the necessary classes
+ wrapper to make the 3D flip work, but won't reorder children — front
must come first in the markup.

## Per-container attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-flip` | required | Marks the container |
| `data-aed-flip-trigger` | `hover` | `hover` or `click` |
| `data-aed-flip-axis` | `y` | `y` (horizontal flip) or `x` (vertical flip) |

## Behavior

- **Wrap-and-stack**: addon inserts a `.aed-fc-inner` wrapper with
  `transform-style: preserve-3d` and `backface-visibility: hidden` on
  each face — both faces sit on top of each other in 3D space.
- **Hover trigger**: pure CSS via `:hover` and `:focus-within`. No
  JS state for hover mode (cheap).
- **Click trigger**: `role="button"`, `aria-pressed`, keyboard support
  (Enter / Space). Persistent state via `.is-flipped` class.
- **Reduced motion**: flip transition disabled (still flips, just
  instantly).
- **Print**: only the front face prints; transform is reset.

## Sizing

The container has a default `height: 240px`. Override per-card with
inline `style="height: 320px"` or via your own CSS scoped to the
class you put on the parent.

## Public API

```js
window.__flip.refresh()       // re-scan after dynamic insert
window.__flip.toggle(el)      // toggle the .is-flipped class
```

## Versioning

`VERSION` constant lives at the top of `flip-card.js`.
