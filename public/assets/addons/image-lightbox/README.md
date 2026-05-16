# Image Lightbox — portable click-to-zoom

A drop-in folder. Marks images with `data-aed-lightbox` (or auto-opts
all images inside a configured scope), then opens them in a fullscreen
modal with keyboard navigation, caption, and counter. No third-party
deps.

## What's in this folder

| File | Role |
|---|---|
| `image-lightbox.css` | Modal scrim, image stage, prev/next buttons, caption / counter, mobile layout. Theme-aware (image background uses card token). |
| `image-lightbox.js` | Discovery (per-image or auto-scope), modal build, keyboard nav, group cycling, body scroll lock. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/image-lightbox/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/image-lightbox/image-lightbox.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/image-lightbox/image-lightbox.js"></script>
```

### Step 4 — opt images in

Two paths.

**Per image** (explicit):

```html
<img src="/work/before.jpg" alt="Before" data-aed-lightbox>

<!-- With higher-resolution swap when zooming -->
<img src="/work/thumb.jpg" alt="Hero" data-aed-lightbox="/work/full.jpg">

<!-- With explicit caption -->
<img src="/x.jpg" alt="X" data-aed-lightbox data-aed-lightbox-caption="Custom caption">

<!-- Group images so left/right cycles within the group -->
<img src="/case-1/a.jpg" alt="A" data-aed-lightbox data-aed-lightbox-group="case-1">
<img src="/case-1/b.jpg" alt="B" data-aed-lightbox data-aed-lightbox-group="case-1">

<!-- Force off if auto mode is on -->
<img src="/logo.svg" alt="Logo" data-aed-lightbox="off">
```

**Auto** (all images inside a scope):

```html
<meta name="aed:lightbox" content="auto" data-scope="article, .case-study, .work-detail">
```

Default scope is `article, main`. With auto on, every `<img>` inside
those containers becomes zoomable unless tagged `data-aed-lightbox="off"`.

## Interactions

| Input | Action |
|---|---|
| Click image (in source page) | Open |
| Esc | Close |
| Click outside image (backdrop) | Close (standard modal pattern) |
| Click image while open | No-op — modal content is non-dismissive |
| ← / → | Previous / next within group (or all opted-in images on the page) |
| Tab + Enter on a marked image | Open via keyboard |
| Single-finger swipe left (scale = 1) | Next image in group |
| Single-finger swipe right (scale = 1) | Previous image in group |
| Single-finger drag (when zoomed in) | Pan within the zoomed image |
| Single-finger drag down (scale = 1) | Drag-to-dismiss — release > 100px → close |
| Two-finger pinch | Zoom in / out (range 1×–4×) |
| Two-finger drag during pinch | Pan to follow midpoint |
| Double-tap (zoomed out) | Zoom in to 2.2× toward the tap point |
| Double-tap (zoomed in) | Reset to fit |
| Vertical scroll up | Passes through (no-op while open) |

## Behavior

- **Discovery on boot**: scans for `data-aed-lightbox` plus auto-mode
  scope. Call `__lightbox.refresh()` after dynamically inserting more.
- **Source override**: setting `data-aed-lightbox="/full.jpg"` swaps the
  src when zooming — useful for thumbnail → high-res patterns.
- **Caption priority**: `data-aed-lightbox-caption` → `alt`.
- **Group nav**: images sharing the same `data-aed-lightbox-group` value
  cycle together. Without a group they all share the implicit `__page__`
  group.
- **Body scroll lock** while open.
- **Print mode**: modal hidden.
- **Reduced motion**: no scale-in / spinner animation.
- **Touch swipe (v0.2.0+)**: single-finger horizontal swipe steps prev/next when |dx| > 40px AND |dx| > |dy|. Drag preview translates the image at half-speed during the gesture so the user feels the photo respond before the commit threshold tips it. Vertical scrolls and pinch-zooms pass through. `touch-action: pan-y` on the stage claims horizontal swipes from the browser's back-gesture.
- **Modal-standard close (v0.2.0+)**: clicking outside the image closes; clicking the image itself does NOT close. v0.1.0 closed on image click — that behavior was non-standard and removed.
- **Pinch-zoom + pan + double-tap (v0.3.0+)**: tablet/mobile gesture suite layered on top of swipe nav. Two-finger pinch scales the image between 1× and 4×; the pinch midpoint anchors the pan so the user "zooms toward" the spot they're pinching. Single-finger drag pans within the zoomed view (range clamped to `(scale - 1) × viewport / 2` per axis). Double-tap toggles between fit and 2.2× zoom (zoom-in centers on the tap point; zoom-out resets). View resets on every prev/next step and on close. Single state machine in JS routes finger-count + zoom-state to the right gesture (`swipe` / `pan` / `pinch`).
- **Drag-down-to-dismiss (v0.4.0+)**: at scale 1, single-finger drag DOWN translates the image with the finger and fades the scrim from 0.92 → 0.22. On release, > 100px closes; ≤ 100px snaps back. Same gesture as Apple Photos / Instagram. Upward drags are no-ops (vertical scroll is locked anyway while the lightbox is open). Drag-down works for single-image lightboxes too.
- **Neighbor preload (v0.4.0+)**: every time a slide is painted, the prev/next siblings' src is fetched into the browser image cache via `new Image()`. Swipes and arrow-key steps paint instantly instead of showing the spinner. HTTP cache dedupes — re-preloading the same src across paints is free.

## Public API

```js
window.__lightbox.open(imgElement)
window.__lightbox.close()
window.__lightbox.refresh()       // re-scan after dynamic content
```

## Versioning

`VERSION` constant lives at the top of `image-lightbox.js`.
