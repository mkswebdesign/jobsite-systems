# Skeleton — portable shimmering placeholder

A drop-in folder. Pure CSS — no JS. Mark any element with
`data-aed-skeleton`; a shimmer sweep plays until you set
`data-aed-skeleton="off"` (or remove the attribute) once content
arrives.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest (no JS — CSS only). |
| `skeleton.css` | Block / line / circle / text variants, shimmer animation, off-state, reduced-motion fallback. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "skeleton": { "enabled": true } }
```

(No JS file in this addon — the manifest's `js` array is empty, so
the dynamic loader emits only the CSS link.)

## Markup

```html
<!-- Block placeholder: take the element's own dimensions -->
<div data-aed-skeleton style="width:100%;height:240px"></div>

<!-- Line variant: thin pill -->
<div data-aed-skeleton="line" style="width:60%"></div>
<div data-aed-skeleton="line" style="width:90%"></div>
<div data-aed-skeleton="line" style="width:75%"></div>

<!-- Circle variant: avatar / icon -->
<div data-aed-skeleton="circle" style="width:48px;height:48px"></div>

<!-- Text variant: pre-built two-line paragraph -->
<div data-aed-skeleton="text" style="width:100%"></div>

<!-- Wrap real content; children stay in place but invisible until "off" -->
<article data-aed-skeleton style="height:300px">
  <h2>Real headline</h2>
  <p>Real paragraph...</p>
</article>
```

When data arrives, swap the attribute:

```js
el.setAttribute('data-aed-skeleton', 'off');
```

…or remove it entirely.

## Variants

| Value | Shape | Use for |
|---|---|---|
| `data-aed-skeleton` (no value) | Block respecting element's width/height | Image / card / section placeholder |
| `data-aed-skeleton="line"` | Thin pill (full-width by default) | Title / single line of text |
| `data-aed-skeleton="circle"` | Round | Avatar / icon |
| `data-aed-skeleton="text"` | Two stacked pill lines | Paragraph stand-in |
| `data-aed-skeleton="off"` | (none — content shows) | Loaded state |

## Behavior

- **Pure CSS animation**: no JS, no IntersectionObserver. Costs
  ~nothing on a page that doesn't use it.
- **Children hidden, not removed**: when active, all children are
  `visibility: hidden`. When you flip to `off`, they reappear in
  place.
- **Reduced motion**: shimmer animation paused (placeholder still
  shows, just not animated).
- **Print mode**: skeletons hidden entirely.

## Why no JS

The whole pattern works with the bare attribute. Your own code (or
any data-fetch library) flips `data-aed-skeleton="off"` when content
arrives — that's the entire integration. Less code = less to break.

## Versioning

This addon has no JS, so no `VERSION` constant. Bump the manifest
or `addon.json` `name` if you fork it.
