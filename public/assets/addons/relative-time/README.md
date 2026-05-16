# Relative Time — portable "3 hours ago" formatter

A drop-in folder. Replaces the textContent of any
`<time data-aed-relative datetime="...">` with a friendly relative
string ("5 minutes ago", "yesterday", "in 3 weeks") that updates every
minute. The element's `title` is set to the absolute localized
datetime so hovering reveals the precise time.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest declaring CSS + JS for the dynamic loader. |
| `relative-time.css` | Tabular numerals + dotted-underline hover affordance. |
| `relative-time.js` | Intl.RelativeTimeFormat-backed (with EN fallback), minute tick, visibility-aware. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": {
  "relative-time": { "enabled": true }
}
```

Then mark up any `<time>` element with a valid `datetime`:

```html
<time datetime="2026-04-19T15:30:00Z" data-aed-relative></time>
<time datetime="2026-05-15T00:00:00Z" data-aed-relative></time>

<!-- Plain style: no dotted underline / cursor:help -->
<time datetime="2026-04-19T15:30:00Z" data-aed-relative data-aed-style="plain"></time>
```

The addon respects the original `datetime` attribute, so the markup
remains semantic and machine-readable even if JS fails or is disabled.

## Behavior

- **Intl.RelativeTimeFormat** when available (modern browsers, all
  major engines) — handles the user's locale. Falls back to English
  ("3 hours ago" / "in 5 days") on older browsers.
- **Tick interval**: re-renders all marked elements once per minute
  and on `visibilitychange` (so a tab returning from background catches
  up immediately).
- **Title attribute**: set to a fully localized absolute datetime
  (month, day, year, hour, minute, timezone) for hover tooltips.

## Public API

```js
window.__relTime.refresh()      // re-render all elements
window.__relTime.format(date)   // get the relative string
window.__relTime.absolute(date) // get the absolute localized string
```

## Versioning

`VERSION` constant lives at the top of `relative-time.js`.
