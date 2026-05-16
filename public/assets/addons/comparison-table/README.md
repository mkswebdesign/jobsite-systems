# Comparison Table — portable JSON-driven matrix

A drop-in folder. Hydrates `[data-aed-compare]` placeholders from a
JSON config block. Renders a clean `<table>` with a highlighted "you"
column and check / x / partial / text cell glyphs. Standard sales-page
asset, no library overhead.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `comparison-table.css` | Table styling, "you" column highlight, section row, cell value glyphs. Theme-aware. |
| `comparison-table.js` | JSON config loader, table build, cell value mapping. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "comparison-table": { "enabled": true } }
```

## Markup

Drop a placeholder + a JSON source for it (the source can live in
`site.json` as a `json[]` entry, or be hand-authored on the page):

```html
<div data-aed-compare data-aed-compare-source="aed-compare-pricing"></div>

<script type="application/json" id="aed-compare-pricing">
{
  "columns": [
    { "label": "Feature" },
    { "label": "gomks", "you": true },
    { "label": "Typical agency" },
    { "label": "DIY builders" }
  ],
  "rows": [
    { "section": "What you get" },
    { "label": "Site design",        "values": ["yes", "yes", "yes"] },
    { "label": "Hosting included",   "values": ["yes", "no", "partial"] },
    { "label": "Updates included",   "values": ["unlimited", "$$ extra", "DIY"] },

    { "section": "Process" },
    { "label": "Setup time",         "values": ["1 week", "4–6 weeks", "0"] },
    { "label": "You manage a CMS",   "values": ["no", "yes", "yes"] }
  ]
}
</script>
```

When using `site.json`, the JSON source can be served via the addon
loader's `json[]` machinery so it lives next to the addon's other
config:

```json
"addons": {
  "comparison-table": {
    "enabled": true,
    "json": [{
      "id": "aed-compare-pricing",
      "data": { "columns": [...], "rows": [...] }
    }]
  }
}
```

## Schema

### Columns

```ts
{
  label: string,        // shown in the header
  you?:  boolean        // marks the highlighted column
}
```

The first column is treated as the "feature label" column — its cells
render as left-aligned row headers (`<th scope="row">`).

### Rows

Two row shapes:

```ts
// Data row
{
  label: string,
  values: Array<string | boolean>   // one less than columns (skips the label col)
}

// Section divider
{ section: string }
```

### Values

| Value | Renders as |
|---|---|
| `true`, `"yes"`, `"✓"` | green check glyph |
| `false`, `"no"`, `"✗"`, `"x"`, `null` | gray x glyph |
| `"partial"`, `"~"` | amber tilde |
| any other string | escaped text content |

## Behavior

- **One source per placeholder**: `data-aed-compare-source` points at
  a `<script type="application/json" id="...">`. Multiple placeholders
  on the same page can reuse the same source.
- **Highlighted "you" column**: the `you: true` column gets brand-
  accent header border + tinted body cells.
- **Mobile**: table fonts shrink slightly. Wrap in a
  `style="overflow-x:auto"` parent if you have many columns.
- **Print mode**: backgrounds become transparent, body becomes ink-
  friendly black.
- **A11y**: `<th scope="col|row">` set on appropriate cells; cell
  glyphs carry `aria-label`s for screen readers.

## Public API

```js
window.__compare.refresh()             // re-scan placeholders
window.__compare.build(el, configObj)  // manual build into a host element
```

## Versioning

`VERSION` constant lives at the top of `comparison-table.js`.
