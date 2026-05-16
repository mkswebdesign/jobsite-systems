# Aurora BG — portable animated gradient background

A drop-in folder. CSS-first. Mark any block element with `data-aed-aurora` and it gets a soft, slowly-drifting orb-cloud background — brand-color tinted, ambient. Perfect for hero sections, CTA blocks, "feature" surfaces.

A tiny optional JS layer adds site-wide auto-scope so a host can stamp `data-aed-aurora` on selectors from a single `<meta>` instead of editing markup. Skip it (or leave the meta out) and the addon stays pure CSS.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `aurora-bg.css` | `::before` + `::after` orb gradients, drift animation, intensity variants, light-theme dim, reduced-motion / print fallbacks. |
| `aurora-bg.js` | Optional auto-scope. Reads `<meta name="aed:aurora-bg">` and stamps `data-aed-aurora*` on matched selectors. Inert without the meta. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "aurora-bg": { "enabled": true } }
```

(No JS file — the manifest's `js` array is empty, so the dynamic
loader emits only the CSS link.)

## Markup

```html
<section data-aed-aurora>
  <div class="container">
    <h1>A productized website service</h1>
    <p>Designed, hosted, kept current.</p>
  </div>
</section>

<!-- Subtle (low opacity, more blur) -->
<section data-aed-aurora data-aed-aurora-intensity="subtle">...</section>

<!-- Bold (more saturated, less blur) -->
<section data-aed-aurora data-aed-aurora-intensity="bold">...</section>

<!-- Static (no drift animation) -->
<section data-aed-aurora data-aed-aurora-static>...</section>
```

## Site-wide auto-scope (optional)

Instead of marking each element, declare a CSS scope in a `<meta>` and the JS layer stamps `data-aed-aurora` on every match. Existing per-element attributes win.

```html
<meta name="aed:aurora-bg" content="on"
      data-auto-scope=".cta-section, .pricing-card[data-featured]"
      data-auto-intensity="bold"
      data-auto-static>
```

| Meta attribute | Purpose |
|---|---|
| `data-auto-scope` | CSS selector — every match gets `data-aed-aurora` |
| `data-auto-intensity` | `subtle` or `bold` — applied as `data-aed-aurora-intensity` |
| `data-auto-static` | Presence-only flag — applies `data-aed-aurora-static` to suppress drift on every match |

Per-page disable (e.g. on a checkout where the motion is distracting):

```html
<html data-aed-aurora-bg="off"> ... </html>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-aurora` | required | Marks the element |
| `data-aed-aurora-intensity` | (default) | `subtle` (lower opacity, more blur) or `bold` (more saturated) |
| `data-aed-aurora-static` | absent | Disable the slow drift animation |

## Behavior

- **Pure CSS**: two pseudo-element layers (`::before` + `::after`) with
  multi-stop radial gradients, animated independently for organic
  motion.
- **Brand-color seeded**: orbs tint with `--accent` and
  `--accent-hover` from the theme tokens — palette follows brand.
- **Light theme**: orbs dim and switch from `mix-blend-mode: screen`
  to `multiply` (avoids sickly bright spots over white).
- **Reduced motion**: animations disabled.
- **Print**: orbs hidden — content prints clean.
- **z-index isolation**: parent gets `isolation: isolate` so the
  pseudo-elements compose only against the element's own background.

## Customizing further

Override variables on the element directly to tune without forking:

```html
<section data-aed-aurora style="--accent:#0ea5e9">...</section>
```

Or override the keyframes / opacity via your own CSS:

```css
[data-aed-aurora]::before { animation-duration: 60s; opacity: 0.4; }
```

## Versioning

This addon has no JS, so no `VERSION` constant. Bump the
`addon.json` when forking.
