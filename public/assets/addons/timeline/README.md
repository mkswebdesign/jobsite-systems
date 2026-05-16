# Timeline — portable vertical timeline

A drop-in folder. Hydrates any `<ol data-aed-timeline>` into a vertical
timeline with a left rail, dot markers, and per-item date labels.
About / company-history / changelog pages — anywhere a list of events
makes more sense as a chronology.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `timeline.css` | Rail, dot states, default + two-column variants. Theme-aware. |
| `timeline.js` | Wraps each `<li>`'s children into a body div, prepends date label + dot. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "timeline": { "enabled": true } }
```

## Markup

```html
<ol data-aed-timeline>
  <li data-when="2008">Founded MKS Web Design.</li>
  <li data-when="2018" data-aed-tl-state="done">Shipped our 100th site.</li>
  <li data-when="2024 Q3">Started prototyping a productized model.</li>
  <li data-when="2026 Q2" data-aed-tl-state="alert">
    <strong>gomks launches.</strong>
    <p>The full productized service, available to anyone who'd benefit.</p>
  </li>
</ol>

<!-- Two-column variant: dates in a left rail -->
<ol data-aed-timeline data-aed-variant="two-col">
  <li data-when="Apr 19">Brand assets approved</li>
  <li data-when="Apr 22">Content drafted</li>
  <li data-when="May 5">Launch</li>
</ol>
```

## Per-item attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-when` | (required for label) | Date / period text — rendered above the body |
| `data-aed-tl-state` | (default ring) | `done` (filled), `muted` (gray), `alert` (amber filled) |

## Variants

| `data-aed-variant` | Layout |
|---|---|
| (default) | Single column. Dot + date label inline above each item's body. |
| `two-col` | Date in a fixed left column; rail + dot in the middle; body on the right. Collapses to single-col on mobile (≤560px). |

## Behavior

- **Children-wrap**: existing children of each `<li>` move into an
  `.aed-tl-body` div so the dot + label don't disturb your authored
  HTML.
- **Skip-empty-when**: items with no `data-when` still render with a
  dot, no label.
- **Final item**: rail fades on the last item so there's no orphan
  trailing line below the bottom dot.

## Public API

```js
window.__timeline.refresh()   // re-scan after dynamic insert
```

## Versioning

`VERSION` constant lives at the top of `timeline.js`.
