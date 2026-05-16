# Grain Overlay — portable lo-fi noise texture

A drop-in folder. Pure CSS, no JS. Adds a subtle film-grain texture as
a fixed full-viewport overlay. Adapts to dark / light theme via blend
mode. Off in print, paused under reduced-motion.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest (CSS-only). |
| `grain-overlay.css` | Inline SVG turbulence filter as `:root::after`, theme-aware blend mode, optional animation. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "grain-overlay": { "enabled": true } }
```

(No JS — the manifest's `js` array is empty, so the dynamic loader
emits only the CSS link.)

## Tuning

The grain is on by default once the addon is enabled. Tune via CSS
variables on `:root`:

```css
:root { --aed-grain-opacity: 0.05; }   /* default 0.08 dark / 0.06 light */
```

Or via attributes on `<html>` (no script needed):

```html
<!-- Animate the grain (subtle slow shift) -->
<html data-aed-grain-animated>...

<!-- Turn off entirely on a specific page -->
<html data-aed-grain="off">...
```

## Behavior

- **Pure CSS**: a fixed `:root::after` with an inline SVG `<filter
  type="fractalNoise">` rendered as a 200×200 tile. Tiled across the
  viewport.
- **Theme adaptation**: `mix-blend-mode: overlay` on dark themes
  (additive grain over backgrounds), `multiply` on light (subtractive
  grain through whites). Avoids the muddy look that one blend mode
  on both themes produces.
- **Performance**: rendered once at load, no JS, no animation by
  default. Even with the optional animation enabled it's a pure
  background-position step every second — cheap.
- **Print**: hidden — printed pages don't need texture.
- **Reduced motion**: animation disabled.

## When to use

- Editorial / portfolio sites where the brand reads as designed.
- Premium service brands where the slight texture differentiates from
  generic templates.

## When to skip

- Marketing landing pages where readability is everything.
- Sites with photo-heavy heroes where the grain would compound with
  image noise.
- Very small / dense type — grain over 14px text can read as muddy.

## Versioning

This addon has no JS, so no `VERSION` constant. Bump the
`addon.json` `name` if you fork it.
