# Business Hours — portable open/closed status pill

A drop-in folder. Hydrates `[data-aed-business-hours]` elements with a
status pill that shows `**Open** · Closes at 6pm CT` /
`**Closing soon** · 5:55pm CT` / `**Closed** · Opens tomorrow at 9am`,
based on your real schedule + timezone. Re-evaluates every minute,
pauses while the tab is hidden, handles DST automatically via Intl.

## What's in this folder

| File | Role |
|---|---|
| `business-hours.css` | Pill styles, status colors (green pulse / amber / gray), variants (`compact`, `dot-only`, `card`). Theme-aware. |
| `business-hours.js` | Config loader, IANA-timezone-aware Intl computation, exceptions, status logic, minute-tick, render. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/business-hours/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/business-hours/business-hours.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/business-hours/business-hours.js"></script>
```

### Step 4 — provide your hours

```html
<script type="application/json" id="aed-business-hours">
{
  "timezone": "America/Chicago",
  "hours": {
    "mon": [{ "open": "09:00", "close": "18:00" }],
    "tue": [{ "open": "09:00", "close": "18:00" }],
    "wed": [{ "open": "09:00", "close": "18:00" }],
    "thu": [{ "open": "09:00", "close": "18:00" }],
    "fri": [{ "open": "09:00", "close": "17:00" }],
    "sat": [],
    "sun": []
  },
  "soonMinutes": 30,
  "exceptions": [
    { "date": "2026-12-25", "closed": true, "label": "Christmas" },
    { "date": "2026-12-31", "hours": [{ "open": "09:00", "close": "13:00" }] }
  ]
}
</script>
```

Without this script tag, every `[data-aed-business-hours]` element
silently hides.

### Step 5 — drop pills wherever they belong

```html
<!-- Default pill: dot + status + detail -->
<span data-aed-business-hours></span>

<!-- Status only (compact) -->
<span data-aed-business-hours data-aed-variant="compact"></span>

<!-- Just the colored dot — for tucking into a logo or nav -->
<span data-aed-business-hours data-aed-variant="dot-only"></span>

<!-- Block card (more breathing room) -->
<span data-aed-business-hours data-aed-variant="card"></span>
```

## Schema

| Field | Type | Purpose |
|---|---|---|
| `timezone` | IANA string | e.g. `"America/Chicago"`, `"Europe/London"`. Defaults to browser's. |
| `hours` | day-keyed object | Keys: `sun`/`mon`/`tue`/`wed`/`thu`/`fri`/`sat`. Values: array of `{ open, close }` ranges (24-hour `HH:MM`). Multiple ranges allowed (e.g. lunch break). Empty array = closed that day. |
| `soonMinutes` | number | How many minutes before close → "closing soon" status; same threshold for "opening soon". Default `30`. |
| `exceptions` | array | One-off date overrides — `{ date: "YYYY-MM-DD", closed: true, label?: "..." }` or `{ date: "YYYY-MM-DD", hours: [{ open, close }] }`. |

## Statuses

| Status | When | Color |
|---|---|---|
| `open` | currently inside an open range, > soonMinutes from close | green (pulses) |
| `closing-soon` | currently open, ≤ soonMinutes from close | amber |
| `opening-soon` | currently closed, ≤ soonMinutes until next open today | amber |
| `closed` | none of the above | gray |

## Behavior

- **Timezone-aware**: every computation runs in the configured zone via
  `Intl.DateTimeFormat`. DST transitions handled automatically.
- **Next-opening lookup**: when closed, walks forward up to 7 days to
  find the next open slot. Output is "Opens at 9am" / "Opens tomorrow at 9am" / "Opens Mon at 9am".
- **Minute-tick**: re-renders every 60s. Pauses when `document.hidden`,
  resumes on tab return.
- **Exceptions**: matched by ISO date in the business timezone. Useful
  for holidays / one-off short days. `closed: true` wins over `hours`.
- **Print mode**: dot hidden, pill becomes plain inline text.
- **Reduced motion**: pulse animation disabled.

## Public API

```js
window.__hours.compute()    // current { status, label, detail } object
window.__hours.refresh()    // re-paint now (e.g. after waking from sleep)
window.__hours.set(cfg)     // override config object + re-render
```

## Versioning

`VERSION` constant lives at the top of `business-hours.js`.
