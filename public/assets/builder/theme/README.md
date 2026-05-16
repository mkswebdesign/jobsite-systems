# Theme — portable dark / light / vibrant modes

Drop-in folder: a three-mode token system (uniform dark, uniform light, and
"vibrant" — authored section rhythm with per-section palette overrides),
system-preference tracking for dark/light, user-toggle override, smooth surface
cross-fade on swap, and FOUC-free pre-paint.

**Vibrant** is the third mode sibling of dark and light. The site's root
palette stays dark, but sections that carry `data-sec-theme="light|white|
primary|…"` light up with their authored palette — producing the typical
"dark hero → white section → primary section → …" contrast rhythm. In Dark
or Light mode those per-section overrides are flattened so the site reads as
a single uniform palette.

## What's in this folder

| File | Role |
|---|---|
| `theme.css` | All CSS custom properties for both modes, theme-aware semantic tokens (shadows, overlays, nav, blend modes), transition activator class, default `.theme-toggle` button styles. |
| `theme.js` | Wires an optional `#themeToggle` button, adds/removes the `html.theme-transitioning` class during swaps, listens to `prefers-color-scheme` until the user makes an explicit choice. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/theme/` into your new site's `public/` directory. Your build tool
should serve these files at `/theme/theme.css` and `/theme/theme.js`.

### Step 2 — add the pre-paint snippet to `<head>`

This must be **inline** (not an external file) and positioned **before** your
CSS loads. It reads `localStorage.getItem('theme')` with a fallback to
`prefers-color-scheme`, then sets `<html data-theme="…">` synchronously. Without
this, every page flashes the default theme before flipping — ugly.

```html
<script>
  (function(){
    try {
      var t = localStorage.getItem('theme');
      if (t !== 'light' && t !== 'dark' && t !== 'vibrant') {
        t = 'vibrant'; // showcase mode on first visit
      }
      document.documentElement.setAttribute('data-theme', t);
    } catch(_) { document.documentElement.setAttribute('data-theme', 'vibrant'); }
  })();
</script>
```

### Step 3 — link `theme.css` in `<head>`

```html
<link rel="stylesheet" href="/builder/theme/theme.css" />
```

Position: after the pre-paint script, before any of your own stylesheets that
reference `var(--accent)` / `var(--bg-primary)` etc. If you need to override
palette values per-brand, emit a later `<style>` block with your own `:root { … }`
(brand overrides win because they come after in source order).

### Step 4 — (optional) meta theme-color tags for iOS status bar

```html
<meta name="theme-color" content="#0a0a0b" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#fafaf9" media="(prefers-color-scheme: light)" />
```

### Step 5 — (optional) add a segmented toggle somewhere visible

```html
<div class="theme-toggle" id="themeToggle" role="radiogroup" aria-label="Site theme">
  <button class="theme-opt" data-mode="dark" type="button" role="radio" aria-label="Dark mode">
    <svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  </button>
  <button class="theme-opt" data-mode="light" type="button" role="radio" aria-label="Light mode">
    <svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
  </button>
  <button class="theme-opt" data-mode="vibrant" type="button" role="radio" aria-label="Vibrant mode">
    <svg class="theme-icon theme-icon-spark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4L12 3z"/></svg>
  </button>
</div>
```

`theme.js` tracks which mode is active via the `.is-active` class and a
sliding `--thumb-index` custom property on the container. Arrow keys move
the selection when the control is focused.

### Step 6 — load `theme.js` before `</body>`

```html
<script defer src="/builder/theme/theme.js"></script>
```

That's the whole install.

## Tokens provided by `theme.css`

### Palette (both modes)

| Token | Dark | Light |
|---|---|---|
| `--bg-primary` | `#0a0a0b` | `#fafaf9` |
| `--bg-secondary` | `#111113` | `#f4f4f5` |
| `--bg-card` | `#18181b` | `#ffffff` |
| `--bg-card-hover` | `#1f1f23` | `#f8fafc` |
| `--text-primary` | `#fafafa` | `#18181b` |
| `--text-secondary` | `#a1a1aa` | `#52525b` |
| `--text-muted` | `#9a9aa2` | `#71717a` |
| `--accent` | `#6B00FF` | `#6B00FF` |
| `--accent-hover` | `#8b5cf6` | `#5b21b6` |
| `--border` | `#27272a` | `#e4e4e7` |
| `--border-light` | `#3f3f46` | `#d4d4d8` |

RGB-tuple companion tokens (`--bg-primary-rgb`, `--bg-secondary-rgb`,
`--accent-rgb`, `--accent-hover-rgb`, `--shadow-color-rgb`) are provided for
use inside `rgba(...)` expressions.

### Semantic (theme-aware)

| Token | Use for |
|---|---|
| `--shadow-card`, `--shadow-lg`, `--shadow-xl`, `--shadow-drawer` | Elevation shadows — soft slate-tinted in light, black-tinted in dark |
| `--nav-scrolled-bg` | Sticky nav on scroll (translucent backdrop) |
| `--scrim-bg` | Modal/drawer overlay |
| `--bg-image-filter`, `…-soft`, `…-strong` | `filter:` stacks for hero/section background images |
| `--hero-aurora-blend` | `mix-blend-mode` for ambient aurora/orb effects (`screen` dark, `multiply` light) |

### Shared (theme-agnostic)

`--radius`, `--radius-sm`, `--radius-lg`, `--max-w`, `--transition`,
`--carousel-speed-*`, `--accent-glow`.

## Overriding per-brand

The simplest pattern — add a later `<style>` block after the theme.css link:

```html
<link rel="stylesheet" href="/builder/theme/theme.css" />
<style>
  :root {
    --accent: #FF3366;
    --accent-rgb: 255, 51, 102;
  }
  :root[data-theme="light"] {
    --accent-hover: #C71E4D;
  }
</style>
```

Brand palette wins; semantic tokens still use brand-overridden values
(shadows with the new `--shadow-color-rgb`, etc.) because they reference the
custom props rather than raw literals.

## localStorage key

`theme` — value is `'light'` or `'dark'` when set. Absence means "follow
system preference".

## Smooth transition

When `theme.js` swaps the theme, it adds `html.theme-transitioning` for 400ms
so all descendants cross-fade their background, color, and border. At rest
there are no transitions applied — no performance cost on hover/scroll.
