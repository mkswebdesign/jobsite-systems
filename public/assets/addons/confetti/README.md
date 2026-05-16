# Confetti — portable canvas burst

A drop-in folder. Pure-canvas confetti — no dependencies, no library
bundle. Brand-color-aware (pulls `--accent` from your theme tokens for
the default palette). Programmatic API + optional auto-bridge to
`/forms/` for one-line conversion delight.

## What's in this folder

| File | Role |
|---|---|
| `confetti.css` | Single full-viewport canvas styling (fixed, pointer-events: none, above toast). |
| `confetti.js` | Particle pool, physics step (rAF), brand-color seeding, auto-bridge gate. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/addons/confetti/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/addons/confetti/confetti.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/addons/confetti/confetti.js"></script>
```

### Step 4 — (optional) wire bridges

```html
<!-- Auto-fire on form success events from /forms/ -->
<meta name="aed:confetti" content="on" data-bridge="form" />
```

Without `data-bridge`, the addon just exposes the API — you fire it
manually from your own code.

## Public API

```js
__confetti.fire({
  origin: { x: 0.5, y: 0.7 },     // 0–1 normalized to viewport
  particleCount: 80,
  spread: 70,                      // degrees of cone
  angle: 90,                       // degrees, 90 = straight up
  startVelocity: 32,
  decay: 0.94,                     // air friction per tick
  gravity: 1,                      // 1 = normal earth-feel
  ticks: 200,                      // particle lifetime (frames)
  scalar: 1,                       // overall size multiplier
  colors: ['#6B00FF', '#fff', '#10b981']  // override palette
})

__confetti.cannon()    // simultaneous bursts from both lower corners
```

All fields optional. Defaults give a tasteful, brand-tinted center-low
burst.

## Examples

```js
// Subtle: 30 particles, low spread, brand-only palette
__confetti.fire({
  particleCount: 30, spread: 40,
  colors: [getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()]
});

// Side cannons for big moments
__confetti.cannon();

// From a specific element (form button after submit, etc.)
const btn = document.querySelector('button[type="submit"]');
const r = btn.getBoundingClientRect();
__confetti.fire({
  origin: { x: (r.left + r.width / 2) / window.innerWidth,
            y: r.top / window.innerHeight },
  particleCount: 60, spread: 90
});

// Toast + confetti together (if both addons installed)
document.addEventListener('aed:form:success', () => {
  __confetti.cannon();
  __toast?.success('Sent — thanks!');
});
```

## Brand-color awareness

When you don't pass `colors`, the palette is built from CSS custom
properties at runtime:

- `--accent` (your brand color)
- `--accent-hover` (a brand-related shade)
- white, soft yellow, green, orange (universal accents)

Brand override flows automatically — no per-brand config needed.

## Behavior

- **Single canvas**: lazy-mounted on first fire, persists for reuse,
  resizes on window resize, never garbage-collected (cheap to keep).
- **Particle decay**: each particle has a `ticks` lifetime + alpha
  fade-out + gravity + air friction. Loop self-terminates when last
  particle expires.
- **Two shapes**: rectangles (70%) + circles (30%) for visual variety.
- **Pointer-events none**: never intercepts clicks.
- **Reduced motion**: silent no-op when `prefers-reduced-motion: reduce`.
  Form-bridge submissions still succeed; the burst just doesn't run.
- **Print mode**: canvas hidden.

## Versioning

`VERSION` constant lives at the top of `confetti.js`.
