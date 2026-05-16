# Internal Versions — portable addon inventory dashboard

A drop-in folder. Hydrates `<div data-aed-versions>` placeholders with
a table of every addon currently loaded on the page (discovered by
scanning `<link>` and `<script>` tags pointing at `/addons/`), with
each addon's `VERSION` constant resolved from its JS source.

Designed for staff-only pages (typically inside the `/internal-fork/`
section or its own `/internal-versions/` route). The addon itself does
no IP gating — host the page behind whatever gate you already use.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `internal-versions.css` | Table styles, file pills (CSS = blue / JS = yellow), version states. Theme-aware. |
| `internal-versions.js` | DOM scanner, manifest + version fetcher, render. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "internal-versions": { "enabled": true } }
```

Drop a placeholder on whichever staff page should host it:

```html
<div data-aed-versions></div>
```

That's it. No JSON config needed — it discovers everything from the
DOM at runtime.

## What it shows

For every addon detected on the current page:

| Column | Source |
|---|---|
| **Addon** | Folder name. Linked to the addon's README. |
| **Files** | Each loaded CSS file (blue pill) and JS file (yellow pill). |
| **Version** | Best-effort match against `VERSION = '...'` literal in the JS source. Green if found, amber `—` if not. |

## Behavior

- **Discovery**: scans every `<link rel="stylesheet" href*="/addons/">`
  and `<script src*="/addons/">` in the document. Groups by the path
  segment after `/addons/`.
- **Manifest fetch**: pulls `/addons/<name>/addon.json` for each addon
  asynchronously. Failure is silent (still shown in table, just no
  manifest data).
- **Version probe**: fetches the first `js` file and regex-matches the
  `VERSION` constant. This is best-effort — minified or restructured
  files may not parse cleanly.
- **Privacy**: this addon makes one fetch per loaded addon when the
  page is opened. Don't ship on production marketing pages — only on
  staff dashboards.

## Public API

```js
window.__internalVersions.refresh()   // re-scan + re-render all dashboards
window.__internalVersions.list()      // bare list { name, css, js }[]
```

## Versioning

`VERSION` constant lives at the top of `internal-versions.js`.
