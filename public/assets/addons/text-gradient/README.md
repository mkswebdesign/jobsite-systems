# Text Gradient — portable brand-color gradient text

A drop-in folder. Pure CSS, no JS. Mark any element with
`data-aed-gradient[="<variant>"]` to give it a brand-color gradient
fill. Three variants: static, shimmer (animated drift),
sweep (hover transition). Optional `rainbow` palette.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest (CSS-only). |
| `text-gradient.css` | Background-clip text gradient + variants + theme + reduced-motion + print fallbacks. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "text-gradient": { "enabled": true } }
```

## Markup

```html
<!-- Static gradient -->
<span data-aed-gradient>productized</span>

<!-- Shimmer — slowly drifts left/right -->
<h1>Built for <span data-aed-gradient="shimmer">scale.</span></h1>

<!-- Sweep — gradient slides on hover -->
<a href="/pricing/" data-aed-gradient="sweep">See pricing</a>

<!-- Multi-color rainbow palette -->
<span data-aed-gradient data-aed-gradient-palette="rainbow">A Rich Design</span>
```

## Variants

| Marker | Behavior |
|---|---|
| `data-aed-gradient` (no value) | Static gradient fill |
| `data-aed-gradient="shimmer"` | Slow alternating drift (6s loop) |
| `data-aed-gradient="sweep"` | Gradient repositions on hover |

## Palette

| `data-aed-gradient-palette` | Source |
|---|---|
| (default) | `--accent` → `--accent-hover` → `--accent` |
| `rainbow` | accent → sky → green → amber → accent |

Override colors per-element by setting the CSS variables inline:

```html
<span data-aed-gradient
      style="--accent:#0ea5e9;--accent-hover:#a855f7">Custom</span>
```

## Behavior

- **Pure CSS**: `background-clip: text` + `color: transparent` — no
  JS, no animation overhead unless `shimmer` is used.
- **Reduced motion**: `shimmer` and `sweep` transitions disabled.
- **Print mode**: gradient stripped, text falls back to ink-friendly
  near-black so it's readable on paper.
- **Browser fallback**: browsers without `background-clip: text`
  support fall back to solid `--accent` color.

## When to use

- One headline accent per page (a single gradient word in a hero).
- A standout link or CTA.
- A brand mark / logo word in the footer.

## When to skip

- Body copy paragraphs (gradient text on small body sizes hurts
  readability).
- Multiple gradients per page — they fight for attention.

## Versioning

This addon has no JS, so no `VERSION` constant. Bump `addon.json`
`name` if you fork it.
