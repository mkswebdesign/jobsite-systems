# Social Proof — portable rotating activity toasts

A drop-in folder. Bottom-left toasts that rotate through items from a
feed you control. Honest by default — the addon ships with no name
generator, no "X people viewing this page" tricks. You supply real items
or none.

## What's in this folder

| File | Role |
|---|---|
| `social-proof.css` | Bottom-left toast, theme-aware, coordinates with consent / contact-fab / booking / exit-intent / lead-bar via CSS `:has`. |
| `social-proof.js` | Feed loader (inline JSON or fetched URL), cycle scheduler with dwell / display / interval / max-cycles, page-visibility pause, dismiss handling. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/social-proof/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/social-proof/social-proof.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/social-proof/social-proof.js"></script>
```

### Step 4 — provide a feed

Inline JSON (simplest, ships with the build):

```html
<script type="application/json" id="aed-social-proof-feed">
[
  { "text": "Currently accepting **3** new clients this quarter", "icon": "users" },
  { "text": "**New intro call** · 2 days ago", "icon": "calendar", "href": "/contact/" },
  { "text": "**Site launched** · last week", "icon": "check" },
  { "text": "April update batch · **12 sites** patched", "icon": "bolt" }
]
</script>
```

Or fetched URL (server-side updates without rebuild):

```html
<meta name="aed:social-proof" content="/data/recent-activity.json" />
```

If both are present, the inline JSON wins.

### Item shape

```ts
{
  text: string,            // **bold** with literal markdown markers
  icon?: 'calendar' | 'check' | 'star' | 'users' | 'sparkle' | 'bolt' | 'bell' | 'message' | 'plus',
  href?: string,           // optional — if set, the whole toast is a link
}
```

Intentionally minimal. The schema doesn't enforce a `name + city + action`
shape because that shape encourages people to fabricate identities. Real
aggregate stats and real anonymized events both fit `{ text, icon }`.

### Step 5 — (optional) tune the cycle

```html
<script type="application/json" id="aed-social-proof-config">
{
  "dwellMs": 8000,
  "displayMs": 6000,
  "intervalMs": 12000,
  "maxCycles": 3,
  "shuffle": false,
  "hideOnPaths": ["/contact/", "/start/"]
}
</script>
```

| Field | Default | Purpose |
|---|---|---|
| `dwellMs` | `8000` | Wait this long after page load before the first toast |
| `displayMs` | `6000` | Each toast is visible for this long |
| `intervalMs` | `12000` | Gap between toast starts (so `intervalMs - displayMs` of empty time between) |
| `maxCycles` | `3` | Stop after this many full passes through the feed (keeps users from seeing the same toast forever) |
| `shuffle` | `false` | Randomize order each pick instead of going in feed order |
| `hideOnPaths` | `[]` | Paths where toasts should never appear |

## Behavior

- **Dismiss**: clicking the X writes a sessionStorage flag and stops the
  cycle for the rest of the tab session. Comes back next session.
- **Page visibility**: cycle pauses when the tab is hidden, resumes on
  return.
- **Coordination**: hidden via CSS while the contact-fab panel, booking
  modal, exit-intent modal, or consent customize modal is open. Slides up
  out of the way of the consent banner. On mobile, lifts above the
  lead-bar when it's active.
- **Click-through**: items with `href` are full anchor tags. Without
  `href` they render as a div (no link behavior).

## Honest-defaults posture

This addon is intentionally limited in ways other "social proof"
libraries are not:

- **No name generator** — there is no built-in "Sarah from Boise" mode.
- **No "people viewing right now"** — this number is almost never
  truthful and degrades trust when it is.
- **No timestamps invented** — relative time strings are part of `text`,
  written by you.
- **Empty feed = silent** — no fallback noise.

You can certainly write fake items into the feed; the addon doesn't stop
you. But it doesn't help you do it.

## Storage

| Key | Storage | Purpose |
|---|---|---|
| `aed:social-proof:dismissed` | sessionStorage | User clicked X this tab session |

## Public API

```js
window.__socialProof.show()     // force next toast now
window.__socialProof.hide()
window.__socialProof.pause()    // stop cycle until resume()
window.__socialProof.resume()
window.__socialProof.reset()    // wipe dismiss + re-arm
window.__socialProof.feed       // current feed (read-only copy)
window.__socialProof.config     // resolved config
```

## Versioning

`VERSION` constant lives at the top of `social-proof.js`. Bump on change.
