# Typewriter — portable cycling text effect

A drop-in folder. Cycles through a list of phrases, typing each
character-by-character with a blinking caret. For hero headlines,
rotating value props, marketing flair. Use sparingly — it's a
gimmick, but a well-known one.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `typewriter.css` | Caret styling, blink animation, ligature suppression. |
| `typewriter.js` | Phrase cycling, char-by-char type/erase, optional loop, reduced-motion fallback. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "typewriter": { "enabled": true } }
```

## Markup

```html
<!-- JSON array (recommended) -->
<h1>We <span data-aed-typewriter='["design.","launch.","maintain."]'></span></h1>

<!-- Pipe-separated (HTML-friendlier when commas are inside phrases) -->
<span data-aed-typewriter="ship fast|ship right|ship every week"
      data-aed-tw-sep="|"></span>

<!-- Custom timing + loop -->
<span data-aed-typewriter='["one","two","three"]'
      data-aed-tw-type="80"
      data-aed-tw-erase="40"
      data-aed-tw-hold="1500"
      data-aed-tw-loop></span>

<!-- No caret -->
<span data-aed-typewriter='["alpha","beta"]' data-aed-tw-no-caret></span>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-typewriter` | required | JSON array `[...]` or separator-delimited list |
| `data-aed-tw-sep` | `,` | Separator when not JSON |
| `data-aed-tw-type` | `70` | ms per character while typing |
| `data-aed-tw-erase` | `35` | ms per character while erasing |
| `data-aed-tw-hold` | `1800` | ms to hold a finished phrase before erasing |
| `data-aed-tw-loop` | absent | Loop forever (default: stop on last phrase) |
| `data-aed-tw-no-caret` | absent | Hide the blinking caret |

## Behavior

- **Type / hold / erase / advance**: standard typewriter cycle. Final
  phrase stays put unless `data-aed-tw-loop` is set.
- **Reduced motion**: per-character animation is replaced with a plain
  cycle that swaps full phrases every `hold` ms. Caret stops blinking
  but stays visible.
- **Print mode**: caret hidden.
- **Ligature-safe**: `font-variant-ligatures: none` prevents
  half-rendered ligatures (e.g. `ff`, `fi`) during typing.

## Use sparingly

A single hero headline phrase rotation is one tasteful application.
Multiple typewriters on the same page or auto-cycling product names
read as gimmicky. Consider whether the message survives without the
animation — if not, write a better message.

## Public API

```js
window.__typewriter.refresh()   // re-scan after dynamic insert
```

## Versioning

`VERSION` constant lives at the top of `typewriter.js`.
