# Scroll Progress — portable reading-depth bar

A drop-in folder. Thin accent-colored bar pinned to the top of every
page, advancing left-to-right as the user scrolls. ~50 lines of code.
Surprisingly load-bearing for "this is a serious article" perception on
long pages.

## What's in this folder

| File | Role |
|---|---|
| `scroll-progress.css` | The bar itself + `--aed-scroll-progress` consumer rules. Honors the announcement-bar height variable so the two coexist. Theme-aware. |
| `scroll-progress.js` | Opt-in gate, page-length measurement, scroll listener with rAF throttling, ResizeObserver for late-loading content. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/scroll-progress/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/scroll-progress/scroll-progress.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/scroll-progress/scroll-progress.js"></script>
```

### Step 4 — opt in with a `<meta>` tag

```html
<meta name="aed:scroll-progress" content="on" />
```

Without it, the script does nothing. With it, every page gets a bar
(if scrollable).

### Step 5 — (optional) thickness override

```html
<meta name="aed:scroll-progress" content="on" data-thickness="thick" />
<!-- or "thin" -->
```

Default is 3px. Thin = 2px. Thick = 5px.

### Per-page disable

Add an attribute on `<html>` of any page that shouldn't show the bar
(e.g., a hero-only landing):

```html
<html data-aed-scroll-progress="off"> ... </html>
```

## Behavior

- **Auto-hide on short pages**: if total page height is barely taller
  than the viewport, the bar doesn't render. No "100% on first scroll"
  noise on your contact page.
- **Coordination with `/announcement-bar/`**: positioned at
  `top: var(--aed-announcement-h, 0px)`. When an announcement is open,
  the progress bar tucks just below it.
- **Re-measure on resize**: handles late-loading images/fonts, dynamic
  content insertion. Uses ResizeObserver where available.
- **Print mode**: hidden in `@media print`.
- **Reduced motion**: bar still updates but without the smoothing
  transition.

## Public API

```js
window.__scrollProgress.refresh()   // re-measure after dynamic insert
window.__scrollProgress.set(0.42)   // manually set bar to 42%
window.__scrollProgress.bar         // the DOM element
```

## Customizing the look

Override the bar style without modifying the addon:

```css
.aed-scroll-progress { height: 2px; }
.aed-scroll-progress::before {
  background: linear-gradient(90deg, var(--accent), #ff3366);
  box-shadow: none;
}
```

## Versioning

`VERSION` constant lives at the top of `scroll-progress.js`.
