# Parallax Section — portable subtle background parallax

A drop-in folder. Marks any section with `data-aed-parallax="<speed>"`
and the addon writes a `--aed-parallax-y` CSS variable on it as it
scrolls through the viewport. Use the variable in `background-position-y`
or on a child `[data-aed-parallax-layer]`'s `transform` — both paths
shipped in the CSS.

Subtle by default — not the cheesy "image moves at 30% of scroll"
kind. The variable is clamped to ±120px and the speed is normalized so
the section's background drifts gently as the section enters / exits
the viewport.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `parallax-section.css` | Default `background-position-y` + child-layer `translate3d` consumers of the CSS variable. Reduced-motion / print fallbacks. |
| `parallax-section.js` | rAF-throttled scroll listener, viewport-relative offset math. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "parallax-section": { "enabled": true } }
```

## Markup

### Background-image parallax

```html
<section data-aed-parallax="0.4"
         style="background-image:url('/hero.jpg');background-size:cover;min-height:60vh">
  <div class="container">
    <h1>Headline</h1>
  </div>
</section>
```

The CSS sets `background-position-y: calc(50% + var(--aed-parallax-y))`
automatically — you only need to set the image + sizing.

### Layer pattern

For non-background art (orbs, illustrations, decorative images),
wrap the moving thing in `[data-aed-parallax-layer]`:

```html
<section data-aed-parallax="0.5" style="position:relative;overflow:hidden;min-height:60vh">
  <div data-aed-parallax-layer
       style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:center">
    <img src="/orb.svg" alt="">
  </div>
  <div class="container" style="position:relative">
    <h1>Headline above the orb</h1>
  </div>
</section>
```

Both patterns read the same `--aed-parallax-y` variable, so a single
section can use both at once if you want layered depth.

## Per-section attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-parallax` | required | Speed 0–1: `0` = fully stationary in viewport, `1` = no parallax (moves with scroll normally). `0.4` is a good starting point. |
| `data-aed-parallax-max` | `120` | Clamp the absolute offset in px |

## Behavior

- **rAF-throttled**: scroll + resize each schedule one rAF callback.
  Cheap even on long pages with many parallax sections.
- **Viewport-relative math**: each section's offset is calculated from
  its center vs the viewport center, normalized to [-1, 1]. So the
  effect peaks as the section is mid-screen and settles at neutral
  when fully out of view.
- **Reduced motion**: addon early-exits and never installs scroll
  listeners. CSS also forces `--aed-parallax-y` to 0.
- **Print mode**: parallax disabled, background centered.
- **GPU layer**: `[data-aed-parallax-layer]` uses `translate3d` +
  `will-change: transform` to upgrade to a compositor layer.

## Public API

```js
window.__parallax.refresh()    // re-scan + re-measure after dynamic insert
```

## Versioning

`VERSION` constant lives at the top of `parallax-section.js`.
