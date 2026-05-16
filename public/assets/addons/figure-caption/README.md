# Figure Caption — portable `<img>` → `<figure>` wrap

A drop-in folder. Wraps any `<img data-caption="...">` in a proper
semantic `<figure>` + `<figcaption>` so screen readers and CMS imports
recognize the relationship. Keeps everything else on the image
intact so siblings like `/image-lightbox/` still work.

Optional auto-mode (via meta tag) wraps every `<img alt>` inside a
configured scope, using the `alt` text as the caption when no
`data-caption` is set.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `figure-caption.css` | Default + side + quote variants. Theme-aware. |
| `figure-caption.js` | Wrap, skip-if-already-inside-figure, auto-mode scope walk. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "figure-caption": { "enabled": true } }
```

## Markup — explicit

```html
<img src="/work/before.jpg"
     alt="Before redesign"
     data-caption="Before — the inherited site at the start of week one">

<!-- Variants -->
<img src="/x.jpg" alt="X"
     data-caption="Side note for context"
     data-aed-fig-variant="side">

<img src="/quote-bg.jpg" alt=""
     data-caption="A short pull-quote about the work."
     data-aed-fig-variant="quote">
```

## Markup — auto-mode

Add the meta to opt every `<img alt>` in a scope into wrapping:

```html
<meta name="aed:figure-caption" content="auto" data-scope="article, .case-study">
```

When auto-mode is on:

- Any `<img alt="...">` inside the scope gets wrapped.
- The `alt` text becomes the caption (no `data-caption` needed).
- Skip individual images with `<img data-aed-fig-skip>`.
- Images already inside a `<figure>` are upgraded in place — the
  addon adds the `data-aed-fig` marker and a `<figcaption>` if
  missing, but never restructures.

## Variants

| `data-aed-fig-variant` | Layout |
|---|---|
| (default) | Caption below image, centered |
| `side` | Caption to the right of the image (collapses to default on ≤640px) |
| `quote` | Italic, left-aligned with brand-accent dot prefix |

## Pairs with `/image-lightbox/`

The wrap preserves `data-aed-lightbox` and any other attributes on
the image, so click-to-zoom continues working. Lightbox caption priority
is `data-aed-lightbox-caption` → `alt`, so explicit captions on the
image still take precedence.

## Public API

```js
window.__figure.refresh()      // re-scan after dynamic insert
window.__figure.wrap(img)      // wrap one image manually
```

## Versioning

`VERSION` constant lives at the top of `figure-caption.js`.
