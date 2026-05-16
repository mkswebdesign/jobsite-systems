# Callout — portable themed boxes

A drop-in folder. Marks `[data-aed-callout="kind"]` elements as themed
notice boxes. Six kinds, theme-aware colors, optional title, optional
icon (auto-derived from the kind).

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `callout.css` | Kind variants, icon colors, theme-aware backgrounds. |
| `callout.js` | Children → body wrap, icon prepend, title support. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "callout": { "enabled": true } }
```

## Markup

```html
<aside data-aed-callout="info">
  Quick note about something.
</aside>

<aside data-aed-callout="warn" data-aed-callout-title="Heads up">
  The merge freeze starts <strong>Friday</strong>.
</aside>

<aside data-aed-callout="success" data-aed-callout-title="Shipped">
  Released v3.2 — see the <a href="/changelog/">changelog</a>.
</aside>

<aside data-aed-callout="danger" data-aed-callout-title="Don't">
  This action will delete all data and cannot be undone.
</aside>

<aside data-aed-callout="tip">
  You can press <kbd>?</kbd> to see all keyboard shortcuts.
</aside>

<aside data-aed-callout="quote">
  "We turn ideas into shipped sites in a week." — Anthony
</aside>
```

## Kinds

| Kind | Color | Icon | Role |
|---|---|---|---|
| `info` (default) | brand accent | (i) | `note` |
| `tip` | sky | lightbulb | `note` |
| `success` | emerald | checkmark | `note` |
| `warn` | amber | triangle | `alert` |
| `danger` | red | (x) | `alert` |
| `quote` | gray, italic | double-quote | `note` |

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-callout` | required | Picks the kind |
| `data-aed-callout-title` | absent | Title rendered above body |

## Behavior

- **Wrap-and-prepend**: existing children move into an `.aed-cl-body`
  div, then a `<span class="aed-cl-icon">` is prepended.
- **A11y**: warn/danger get `role="alert"`; others get `role="note"`.
- **Print mode**: backgrounds become transparent, body text becomes
  near-black for ink-friendly output.

## Public API

```js
window.__callout.refresh()   // re-scan after dynamic insert
```

## Versioning

`VERSION` constant lives at the top of `callout.js`.
