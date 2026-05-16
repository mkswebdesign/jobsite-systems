# Avatar Stack — portable overlapping avatar row

A drop-in folder. Wraps existing `<img>` and `<span data-initials>`
children of any `[data-aed-avatars]` container into a tasteful
overlapping circle row, with an optional `+N` counter and side label.

Auto-decoration (not auto-generation) means alt text and accessibility
stay where you authored them, and you can mix real headshots with
initials-only entries.

## What's in this folder

| File | Role |
|---|---|
| `avatar-stack.css` | Overlap, border-against-bg, hover lift, three sizes (sm/default/lg), compact variant. Theme-aware. |
| `avatar-stack.js` | Discovery, `<img>` + initials decoration, counter + label append. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/addons/avatar-stack/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/addons/avatar-stack/avatar-stack.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/addons/avatar-stack/avatar-stack.js"></script>
```

### Step 4 — author markup

```html
<div data-aed-avatars
     data-aed-avatars-extra="12"
     data-aed-avatars-label="readers">
  <img src="/team/sarah.jpg" alt="Sarah K.">
  <img src="/team/joe.jpg" alt="Joe M.">
  <img src="/team/anna.jpg" alt="Anna L.">
  <span data-initials="AR" data-color="#6B00FF"></span>
</div>
```

Renders as: 4 overlapping circles + "+12" pill + "**16+** readers".

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-avatars` | (required) | Marks the container |
| `data-aed-avatars-extra` | `0` | Number for the trailing "+N" counter (omit / 0 to hide) |
| `data-aed-avatars-label` | none | Side label after the counter (e.g. `"readers"`, `"clients"`). Total count is shown bolded. |
| `data-aed-size` | (default) | `sm` (28px), default (36px), `lg` (48px) |
| `data-aed-variant` | (default) | `compact` to hide the label even when one is set |

## Children

| Element | Becomes |
|---|---|
| `<img src=… alt=…>` | A circular avatar with the image. Keep `alt` for screen readers. |
| `<span data-initials="AR">` | A circular initials chip. Inner text optional — `data-initials` is used if empty. |
| `<span data-initials="AR" data-color="#…">` | Same, with custom background color. Defaults to brand `--accent`. |

## Counter math

The `+N` pill comes from `data-aed-avatars-extra` directly. The label
shows `(visible avatars + extra)+ <label>`. So three `<img>` + `extra=12`
+ `label="readers"` renders "**15+** readers".

## Behavior

- **Auto-decoration**: existing alt text and image src are preserved —
  the addon just adds classes.
- **Hover lift**: each avatar lifts and z-indexes above neighbors on
  hover. Disabled with `prefers-reduced-motion: reduce`.
- **Initials default color**: brand `--accent`. Override per-avatar via
  `data-color`.
- **Print mode**: no special handling — circles print as-is.

## Public API

```js
window.__avatars.refresh()   // re-scan after dynamic insert
```

## Versioning

`VERSION` constant lives at the top of `avatar-stack.js`.
