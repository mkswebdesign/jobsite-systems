# Uptime Status — portable trust pill

A drop-in folder. Hydrates `[data-aed-uptime]` elements from your status
page and shows a tiny pill: green dot + "All systems operational" when
healthy, amber when degraded, red blinking when down. Trust signal that
costs nothing once your status page exists.

## What's in this folder

| File | Role |
|---|---|
| `uptime-status.css` | Pill styles, status colors, dot animations (pulse for healthy, blink for outage), bare variant for footers. Theme-aware. |
| `uptime-status.js` | Provider URL builders (instatus / statuspage / custom), session-cache (60s), per-element render with link to status page. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/uptime-status/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/uptime-status/uptime-status.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/uptime-status/uptime-status.js"></script>
```

### Step 4 — point at your status page

```html
<!-- Instatus: subdomain only -->
<meta name="aed:uptime" content="instatus:gomks" />

<!-- Atlassian Statuspage: page-id (subdomain) only -->
<meta name="aed:uptime" content="statuspage:gomks" />

<!-- Anything else: full URL to a JSON endpoint -->
<meta name="aed:uptime" content="custom:https://status.example.com/api/status" />
```

Without a meta tag the addon does nothing and `__uptime` is a stub —
safe to leave loaded without configuration.

### Step 5 — drop pills wherever they belong

```html
<!-- Anchor: hydrates to a link pointing at your full status page -->
<a data-aed-uptime></a>

<!-- Span/div: same pill, no link behavior -->
<span data-aed-uptime></span>

<!-- Bare variant for footers (no border / background) -->
<a data-aed-uptime data-aed-variant="bare"></a>
```

## Statuses + colors

| Internal status | Color | Animation | Provider mappings |
|---|---|---|---|
| `operational` | green | gentle pulse | instatus `UP`, statuspage `none` |
| `degraded` | amber | none | instatus `HASISSUES`, statuspage `minor` |
| `outage` | red | blink | statuspage `major` / `critical` |
| `maintenance` | indigo | none | instatus `UNDERMAINTENANCE`, statuspage `maintenance` |
| `unknown` | (hidden) | — | parse failure, network error |

When the status is `unknown`, every `[data-aed-uptime]` element is
silently hidden. The addon never renders an "Unknown" badge — that
would erode the trust signal it's there to provide.

## Custom JSON shape

If you point at `custom:https://...`, the response should be:

```json
{
  "status": "operational",
  "label": "All systems operational",
  "pageUrl": "https://status.example.com/"
}
```

`status` must be one of `operational`, `degraded`, `outage`,
`maintenance`. `label` is what the pill shows. `pageUrl` is where the
anchor variant links to (omit for span/div variants).

## Caching

Per-tab sessionStorage cache, 60-second TTL. Multi-page navigation
within a tab won't re-hit the API. Bypass with `__uptime.refresh()`.

## Public API

```js
window.__uptime.get()        // current state (or null before first fetch)
window.__uptime.set(state)   // manual override + re-render
window.__uptime.refresh()    // bypass cache, re-fetch, re-render
```

## Versioning

`VERSION` constant lives at the top of `uptime-status.js`.
