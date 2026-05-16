# Back to Top — portable scroll-to-top button

A drop-in folder. Tiny round button bottom-LEFT (clears the contact-fab
on the right) that fades in past a scroll threshold and smooth-scrolls
to top on click. Standard, expected, frequently re-implemented.

## What's in this folder

| File | Role |
|---|---|
| `back-to-top.css` | Round button, fade-in transitions, sibling-overlay coordination via CSS `:has`. Theme-aware. |
| `back-to-top.js` | Opt-in gate, threshold-based visibility toggle (rAF-throttled), smooth-scroll, reduced-motion fallback. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/back-to-top/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/back-to-top/back-to-top.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/back-to-top/back-to-top.js"></script>
```

### Step 4 — opt in with a `<meta>` tag

```html
<meta name="aed:back-to-top" content="on" />

<!-- Fully configured -->
<meta name="aed:back-to-top" content="on"
      data-threshold="800"
      data-position="right"
      data-offset-x="1.25rem"
      data-offset-y="1.25rem"
      data-size="48"
      data-style="circle" />
```

| Meta attribute | Default | Purpose |
|---|---|---|
| `data-threshold` | `600` | Scroll distance (px) before the button fades in |
| `data-position` | `left` | `left` or `right` edge placement. Pick `left` when the contact-fab is enabled (right edge). |
| `data-offset-x` | `1.5rem` | Distance from the chosen edge (CSS length — `rem`, `px`, etc.) |
| `data-offset-y` | `1.5rem` | Distance from the bottom of the viewport |
| `data-size` | `44` | Button diameter in px (mobile shrinks to 40 via a media query override) |
| `data-style` | `circle` | `circle` (default), `square` (8px rounded), or `pill` (adds a "Top" label) |

### Per-page disable

```html
<html data-aed-back-to-top="off"> ... </html>
```

## Behavior

- **Position**: bottom-left, 44px circle on desktop, 40px on mobile.
  Picked left so it never collides with `/contact-fab/` on the right.
- **Threshold**: button fades in once `scrollY > threshold` (default
  `600`). rAF-throttled scroll listener.
- **Smooth scroll**: uses `scrollTo({ behavior: 'smooth' })`. Falls
  back to instant when `prefers-reduced-motion: reduce`.
- **Coordination via CSS `:has()`**:
  - Slides up 86px when `.consent-banner.is-open` is in the DOM.
  - Slides up 72px on mobile when a `.aed-sp-toast.is-open` (social-proof) is present.
  - Hidden entirely on mobile when `body.aed-leadbar-active` (the lead-bar covers the bottom edge with a full-width strip).
- **Print mode**: hidden in `@media print`.
- **Reduced motion**: no scale/translate animation, no smooth scroll.

## Public API

```js
window.__backToTop.scroll()   // programmatic scroll-to-top
window.__backToTop.show()
window.__backToTop.hide()
window.__backToTop.el         // the button DOM node
```

## Versioning

`VERSION` constant lives at the top of `back-to-top.js`.
