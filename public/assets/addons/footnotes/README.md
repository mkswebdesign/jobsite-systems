# Footnotes — portable markdown-style footnote linker

A drop-in folder. Connects inline `<sup data-aed-fn="N">` markers to
`<li id="fn-N">` entries in a footnote list. Adds hover popups,
back-links, and smooth-scroll jumps. Plays nicely with the rest of the
addon family.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `footnotes.css` | Marker styling, footnote list card, hover popup. Theme-aware. |
| `footnotes.js` | Marker→footnote linking, back-link injection, popup positioning. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "footnotes": { "enabled": true } }
```

## Markup

Inline markers anywhere in the body:

```html
<p>
  The merge freeze<sup data-aed-fn="1">1</sup> begins Friday and
  affects all non-critical PRs<sup data-aed-fn="2">2</sup>.
</p>
```

A footnote list somewhere on the page (typically just before the
footer or as part of an `<aside>`):

```html
<ol data-aed-footnotes>
  <li id="fn-1">Per the engineering calendar — March 5, 2026.</li>
  <li id="fn-2">"Critical" = security / data loss. Anything else: queue
    until after the freeze.</li>
</ol>
```

That's the entire integration. The addon wires the markers and footnotes
together, adds back-arrows, and shows hover popups on desktop.

## Behavior

- **Linking**: each `<sup data-aed-fn="N">` is wrapped in an
  `<a href="#fn-N">`. The marker also gets `id="fnref-N"` so the
  footnote can link back.
- **Back-arrow**: a `↩` link is appended to each `<li id="fn-N">`
  pointing to `#fnref-N`. Readers tap to return where they were.
- **Hover popup**: desktop only — the footnote contents render in a
  tooltip near the marker. Touch devices skip the popup; tap = jump.
- **Scroll offset**: footnote `<li>` items get
  `scroll-margin-top: calc(var(--aed-announcement-h, 0) + var(--aed-nav-h, 80px) + 16px)`,
  so jumps clear the sticky nav and any open announcement bar.
- **Print mode**: the popup is hidden; everything else prints normally
  and stays linkable in PDFs.

## Public API

```js
window.__footnotes.refresh()   // re-scan after dynamic insert
```

## Versioning

`VERSION` constant lives at the top of `footnotes.js`.
