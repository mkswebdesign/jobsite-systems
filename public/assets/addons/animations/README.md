# Animations — portable entrance motion

A drop-in folder. Sprinkle `data-aed-fade-up`, `data-aed-zoom-in`, etc.,
on any element to get a tasteful one-shot entrance animation when it
scrolls into view. IntersectionObserver-driven, single-fire by default,
respects `prefers-reduced-motion`.

## What's in this folder

| File | Role |
|---|---|
| `animations.css` | Initial states + `is-visible` end states for 7 directions. Reduced-motion + print + no-JS fallbacks all force the visible state. |
| `animations.js` | Opt-in gate, per-element delay/duration, per-parent stagger, IntersectionObserver attach, replay mode. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/addons/animations/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/addons/animations/animations.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/addons/animations/animations.js"></script>
```

### Step 4 — opt in with a `<meta>` tag

```html
<meta name="aed:animations" content="on" />

<!-- Optional: trigger threshold (0–1). Default 0.15 = element 15% in view -->
<meta name="aed:animations" content="on" data-threshold="0.25" />
```

Without it, the script does nothing and the marker attributes are
inert (the CSS keeps everything visible).

## Site-wide auto-promotion (optional)

Instead of sprinkling `data-aed-fade-*` attributes on each element, you
can declare a CSS scope in the `<meta>` and the addon will stamp the
requested effect on every match. Elements that already have any
`data-aed-*` animation attribute are skipped.

```html
<meta name="aed:animations" content="on"
      data-auto-scope=".page-header h1, .page-header .lead"
      data-auto-effect="fade-up"
      data-auto-stagger=".services-grid, .work-grid"
      data-auto-stagger-ms="80"
      data-threshold="0.2">
```

| Meta attribute | Purpose |
|---|---|
| `data-auto-scope` | Selector — every match gets the chosen effect attr |
| `data-auto-effect` | `fade-in` / `fade-up` / `fade-down` / `fade-left` / `fade-right` / `zoom-in` / `zoom-out` (default `fade-up`) |
| `data-auto-stagger` | Selector for parents whose children should cascade (stamps `data-aed-stagger-children`) |
| `data-auto-stagger-ms` | Stagger step in ms (default 80 via per-parent logic) |

## Global on/off toggles + site-wide knobs (v0.3+)

All of these are single-source-of-truth meta attrs. JS reads them on
boot, writes the CSS variables they imply to `<html>`, applies the
behavioral ones to the IntersectionObserver, and toggles `<html>`
classes for the global kill-switches. Per-element `data-aed-*` attrs
always override site-wide defaults.

```html
<meta name="aed:animations" content="on"
      data-element-animations="true"
      data-page-transitions="true"
      data-default-duration-ms="700"
      data-default-easing="cubic-bezier(0.4, 0, 0.2, 1)"
      data-translate-distance="24px"
      data-zoom-scale="0.94"
      data-threshold="0.15"
      data-respect-reduced-motion="true"
      data-replay-default="false"
      data-page-transition-duration-ms="500"
      data-page-transition-easing="cubic-bezier(0.4, 0, 0.2, 1)"
      data-body-fade-in-ms="500"
      data-disabled-pages="/admin/,/login/">
```

### Global on/off toggles (v0.3)

The two families of motion (scroll-reveal on elements, page transitions
on load + route change) toggle **independently**. You can have page
transitions but no scroll reveals, or vice-versa, or both off.

| Meta attribute | Default | Effect when `false` |
|---|---|---|
| `data-element-animations` | `true` | Adds `html.aed-no-element-anims`. Every `data-aed-fade-*` / `data-aed-zoom-*` element shows instantly. The IntersectionObserver is never wired (perf win). |
| `data-page-transitions` | `true` | Adds `html.aed-no-page-transitions`. Body fade-in + `.page-transition` overlay are zeroed to `0ms`. Navigation pops instantly. |

### Element-animation tuning (scroll-reveal)

| Meta attribute | Purpose |
|---|---|
| `data-default-duration-ms` | Default transition duration in ms (writes `--aed-anim-duration`). |
| `data-default-easing` | Default timing-function (writes `--aed-anim-ease`). |
| `data-translate-distance` | Travel distance for fade-up/down/left/right (writes `--aed-anim-distance`). |
| `data-zoom-scale` | Starting scale for zoom-in; zoom-out uses its inverse (writes `--aed-anim-zoom-in` + `--aed-anim-zoom-out`). |
| `data-threshold` | IntersectionObserver threshold (0–1). |
| `data-respect-reduced-motion` | When `true` (default), honour `prefers-reduced-motion: reduce`. |
| `data-replay-default` | Site-wide default for re-entry replay. Per-element `data-aed-replay` still wins. |

### Page-transition tuning

The site's body fade-in + `.page-transition` overlay (used on route
changes) consume these vars. Defined in `base.css` with fallbacks so
sites that don't load the animations addon still render identically.

| Meta attribute | Writes CSS var | Consumed by |
|---|---|---|
| `data-page-transition-duration-ms` | `--page-transition-duration` | `.page-transition.fade-out` + `.page-transition.fade-in` |
| `data-page-transition-easing` | `--page-transition-easing` | Both `.page-transition` animations + body fade-in |
| `data-body-fade-in-ms` | `--body-fade-in-duration` | `body { animation: bodyFadeIn … }` on page paint |

### Addon-wide kill switch

| Meta attribute | Purpose |
|---|---|
| `data-disabled-pages` | Comma-separated pathname prefixes where the whole addon skips (`/admin/` disables `/admin/*`). Disables BOTH element anims + page transitions. For granular control, use `data-element-animations` / `data-page-transitions` instead. |

## Direction attributes

| Attribute | Effect |
|---|---|
| `data-aed-fade-in` | Just fades in |
| `data-aed-fade-up` | Slides 24px up + fades in |
| `data-aed-fade-down` | Slides 24px down + fades in |
| `data-aed-fade-left` | Slides 24px from right + fades in |
| `data-aed-fade-right` | Slides 24px from left + fades in |
| `data-aed-zoom-in` | Scales from 0.94 + fades in |
| `data-aed-zoom-out` | Scales from 1.06 + fades in |

## Per-element tuning

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-delay="200"` | `0` ms | Wait this long after triggering before animation starts |
| `data-aed-duration="900"` | `700` ms | Override the transition duration |
| `data-aed-replay` | absent | Animate every time the element re-enters viewport (default: single-fire) |

## Stagger pattern

Cascade child delays without writing N explicit attributes:

```html
<ul data-aed-stagger-children data-aed-stagger="80">
  <li data-aed-fade-up>First</li>      <!-- delay 0   -->
  <li data-aed-fade-up>Second</li>     <!-- delay 80  -->
  <li data-aed-fade-up>Third</li>      <!-- delay 160 -->
</ul>
```

The parent's `data-aed-stagger` value is ms per step (default `80`).
Existing per-child `data-aed-delay` is added on top of the stagger
offset, not overwritten.

## Behavior

- **Single-fire by default**: once shown, observer disconnects. Add
  `data-aed-replay` if you want it to animate every entry.
- **Reduced motion**: skips animation entirely, jumps straight to the
  visible state. Same for print mode.
- **No-JS fallback**: CSS uses `html.no-js` to force everything visible
  when JS is disabled. Your layout already removes `.no-js` inline at
  the top of `<head>`.
- **Will-change**: applied while the addon manages the element. Browser
  upgrades to a compositor layer for the animation.

## Per-page disable

```html
<html data-aed-animations="off"> ... </html>
```

## Public API

```js
window.__animations.refresh()   // re-scan after dynamic content insert
window.__animations.show(el)    // manually mark visible
window.__animations.hide(el)    // manually reset (for replay scenarios)
```

## Coordination

Pairs cleanly with:

- `/anchor-headings/` — animated headings still get the `#` link.
- `/toc/` — TOC scrollspy fires regardless of animation state.
- `/scroll-progress/` — animations don't affect scroll math.

## Versioning

`VERSION` constant lives at the top of `animations.js`.
