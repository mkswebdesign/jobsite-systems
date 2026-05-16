# Timezone Converter — portable "your local time" annotator

A drop-in folder. Hydrates `[data-aed-tz]` elements with a source time
+ the visitor's local equivalent ("2:00 PM CT · 12:00 PM PT (your time)").
Hides the local part when the visitor's timezone matches the source.

Useful on booking pages, event listings, office hours, or anywhere
you'd otherwise force readers to do the math.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `timezone-converter.css` | Inline + card variants, source/local styling. Theme-aware. |
| `timezone-converter.js` | DST-correct wall-clock-in-zone parsing via Intl, render. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "timezone-converter": { "enabled": true } }
```

## Markup

```html
<!-- Time only (uses today's date in source TZ) -->
<span data-aed-tz="14:00" data-aed-tz-from="America/Chicago"></span>

<!-- Local datetime + explicit source TZ -->
<span data-aed-tz="2026-05-15T14:00" data-aed-tz-from="America/Chicago"></span>

<!-- ISO with offset (source TZ inferred) -->
<span data-aed-tz="2026-05-15T14:00:00-05:00"></span>

<!-- Show date too -->
<span data-aed-tz="2026-05-15T14:00" data-aed-tz-from="America/Chicago"
      data-aed-tz-show-date></span>

<!-- Card variant (stacked) -->
<span data-aed-tz="2026-05-15T14:00" data-aed-tz-from="America/Chicago"
      data-aed-tz-variant="card"></span>

<!-- Custom local label -->
<span data-aed-tz="14:00" data-aed-tz-from="America/Chicago"
      data-aed-tz-local-label="local"></span>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-tz` | required | Source time (`HH:MM`, `YYYY-MM-DDTHH:MM`, or full ISO) |
| `data-aed-tz-from` | visitor tz | IANA source timezone (e.g. `America/Chicago`) |
| `data-aed-tz-show-date` | absent | Include the date in the rendered string |
| `data-aed-tz-variant` | (default) | `card` for stacked block style |
| `data-aed-tz-local-label` | `"your time"` | Suffix for the visitor-local rendering |

## Behavior

- **DST-correct**: wall-clock-in-zone parsing handles spring-forward /
  fall-back via `Intl.DateTimeFormat`.
- **Same-zone**: when visitor's timezone equals source, the local
  rendering is suppressed (no redundant "(your time)" suffix).
- **Title attribute**: full source + local string set as a hover
  tooltip — works even on the inline variant.
- **Time-only inputs** anchor to "today in source TZ" — useful for
  recurring events ("our office hours: 9:00 CT").

## Public API

```js
window.__tz.refresh()                              // re-render all
window.__tz.format(date, 'America/Chicago')        // format one ad-hoc
window.__tz.localTz()                              // visitor's IANA tz string
```

## Versioning

`VERSION` constant lives at the top of `timezone-converter.js`.
