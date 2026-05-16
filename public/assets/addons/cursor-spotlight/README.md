# Cursor Spotlight — portable cursor-following highlight

A drop-in folder. Adds a soft radial highlight that follows the
cursor inside any opted-in `[data-aed-cursor-spotlight]` element.
Adds depth and "presence" to hero sections and CTA blocks without a
visible decoration. Touch devices skip it (no cursor).

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `cursor-spotlight.css` | `::before` radial gradient consuming `--aed-cs-x/y/size/opacity`. Theme-aware blend mode. |
| `cursor-spotlight.js` | Mouse tracking → CSS variables. Touch-device early exit. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "cursor-spotlight": { "enabled": true } }
```

## Markup

```html
<section data-aed-cursor-spotlight>
  <h1>Headline</h1>
</section>

<!-- Bigger / brighter -->
<section data-aed-cursor-spotlight
         style="--aed-cs-size:480px;--aed-cs-opacity:0.25">
  ...
</section>
```

## Per-element variables

| CSS variable | Default | Purpose |
|---|---|---|
| `--aed-cs-size` | `320px` | Diameter of the radial highlight |
| `--aed-cs-opacity` | `0.18` | Peak opacity at full hover |

Set per-element via inline `style="..."`, or globally via your own
CSS scoped to a class.

## Behavior

- **CSS-driven paint**: the JS only writes two CSS variables
  (`--aed-cs-x`, `--aed-cs-y`). CSS does the actual gradient fill.
  Cheap to track, GPU-friendly.
- **Theme adaptation**: `mix-blend-mode: screen` on dark themes
  (additive light); `multiply` on light themes (subtractive shadow).
- **Touch devices**: addon early-exits in JS; CSS also hides the
  `::before` under `@media (hover: none)`.
- **Reduced motion**: opacity transition disabled (still works,
  just no fade).
- **Print**: hidden.

## Public API

```js
window.__cursorSpotlight.refresh()   // re-scan after dynamic insert
```

## Versioning

`VERSION` constant lives at the top of `cursor-spotlight.js`.
