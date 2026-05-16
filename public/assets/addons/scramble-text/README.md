# Scramble Text — portable cipher-decode reveal

A drop-in folder. Reveals an element's text via a brief
character-by-character "decoding" pass — random glyphs cycle while
each position resolves to the real character. Tasteful for hero
headlines (one per page), section labels, single section reveals.
Use sparingly.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `scramble-text.css` | Styling for the pending-character spans. Theme-aware. |
| `scramble-text.js` | Trigger gates (scroll / load / hover), reveal scheduler, reduced-motion skip. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "scramble-text": { "enabled": true } }
```

## Markup

```html
<!-- Default: triggers on scroll-into-view (40% visible) -->
<h1 data-aed-scramble>Production websites, managed for you</h1>

<!-- Trigger on page load -->
<h1 data-aed-scramble data-aed-scr-trigger="load">Welcome</h1>

<!-- Trigger on hover (re-runs each hover) -->
<span data-aed-scramble data-aed-scr-trigger="hover">Hover me</span>

<!-- Custom timing -->
<h1 data-aed-scramble
    data-aed-scr-duration="1500"
    data-aed-scr-cycles="6">Bigger, slower decode</h1>

<!-- Custom character pool -->
<h1 data-aed-scramble
    data-aed-scr-chars="!@#$%^&*░▒▓ABCDEF0123456789">Cyber-coded</h1>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-scramble` | required | Element's textContent is the target string |
| `data-aed-scr-trigger` | `scroll` | `scroll` / `load` / `hover` |
| `data-aed-scr-duration` | `900` ms | Total reveal duration |
| `data-aed-scr-cycles` | `4` | Scramble passes per character before resolving |
| `data-aed-scr-chars` | mixed ASCII + box-drawing | Character pool to scramble through |

## Behavior

- **Original text preserved**: stored in `el._aedScrTarget` before
  scramble starts. `el.textContent` is reset to the target on
  completion.
- **Spaces and newlines** are never scrambled — they stay where they
  are throughout, so the layout doesn't reflow.
- **Reduced motion**: animation is fully skipped — text is shown as
  authored from the first paint. No flicker.
- **Trigger=scroll**: IntersectionObserver fires when 40% of the
  element is in view. Single-fire (observer disconnects after).
- **Trigger=hover**: re-runs every mouseenter — fine for small labels,
  use sparingly on long strings.

## Use sparingly

A single hero headline using this effect is striking. Three of them on
the same page reads as fidgety. Combine with `/animations/` (fade-up)
on neighboring elements rather than scrambling everything.

## Public API

```js
window.__scramble.refresh()    // re-scan after dynamic insert
window.__scramble.run(el)      // manually trigger scramble
```

## Versioning

`VERSION` constant lives at the top of `scramble-text.js`.
