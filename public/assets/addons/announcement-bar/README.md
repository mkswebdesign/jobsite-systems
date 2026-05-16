# Announcement Bar — portable top-of-page strip

A drop-in folder. Single full-width strip pinned to the top of every
page that includes it. Reads one announcement from inline JSON.
Optional `start` / `end` dates schedule when it appears. Dismissable by
the user; persists per-id in localStorage so they don't see the same
banner twice.

## What's in this folder

| File | Role |
|---|---|
| `announcement-bar.css` | Strip styles (promo / info / warn / alert variants), CTA pill, close X, nav-coordination rules. |
| `announcement-bar.js` | Config loader, schedule check, per-id dismiss persistence, layout measurement, render. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/announcement-bar/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/announcement-bar/announcement-bar.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/announcement-bar/announcement-bar.js"></script>
```

### Step 4 — provide an announcement

```html
<script type="application/json" id="aed-announcement-bar">
{
  "id": "q2-launch",
  "kind": "promo",
  "icon": "sparkle",
  "text": "**Just launched:** new productized service.",
  "cta": { "label": "Read more", "href": "/about/" },
  "start": "2026-04-19",
  "end": "2026-05-19",
  "dismissable": true,
  "hideOnPaths": ["/contact/"]
}
</script>
```

If the script tag isn't present, the addon does nothing — there's no
default banner.

### Schema

| Field | Default | Purpose |
|---|---|---|
| `id` | hash of `text` | Unique identifier for dismiss tracking. Bump it when you change the message — users will see the new one. |
| `kind` | `"promo"` | One of `promo` (accent), `info` (neutral card), `warn` (amber), `alert` (red) |
| `icon` | `null` | One of `sparkle`, `bell`, `bolt`, `info`, `warn`, `calendar`, `star` |
| `text` | required | Body copy. Supports `**bold**`. |
| `cta` | `null` | `{ label, href, target? }`. Renders as a pill on the right. |
| `start` | `null` | ISO date / datetime. Banner hidden before this. |
| `end` | `null` | ISO date / datetime. Banner hidden after this. |
| `dismissable` | `true` | Show the X close button. |
| `hideOnPaths` | `[]` | Paths where the banner shouldn't show. |
| `showOnlyOnPaths` | `null` | If set, banner only shows on these paths (inverse of `hideOnPaths`). |
| `position` | `"top"` | `"top"` or `"bottom"`. Bottom variant pads `body` from the bottom and casts a shadow upward. |
| `dismissCooldownDays` | `0` | If `> 0`, dismiss is temporary — banner re-shows after N days instead of being permanently hidden. Useful for multi-week launch windows where you want to re-engage users who dismissed early. |

## Layout coordination

The addon is `position: fixed`, pinned to either edge based on `position`. The script sets one of two CSS vars on `<html>`:

| Position | Var | Body class |
|---|---|---|
| `top` | `--aed-announcement-h` | `aed-has-announcement--top` |
| `bottom` | `--aed-announcement-bottom-h` | `aed-has-announcement--bottom` |

`aed-has-announcement` is also added in both cases for any selectors that don't care about the side.

The shipped CSS pushes content out of the way:

```css
body.aed-has-announcement--top    { padding-top: var(--aed-announcement-h, 0px); }
body.aed-has-announcement--bottom { padding-bottom: var(--aed-announcement-bottom-h, 0px); }
body.aed-has-announcement--top nav.nav,
body.aed-has-announcement--top header.nav,
body.aed-has-announcement--top header[role="banner"],
body.aed-has-announcement--top .site-nav {
  top: var(--aed-announcement-h, 0px) !important;
}
```

Those four selectors cover most nav patterns. If your nav uses something else, add a one-line override in your global CSS keyed off the same body class.

## Storage

| Key | Storage | Purpose |
|---|---|---|
| `aed:announcement:dismissed:<id>` | localStorage | User dismissed this announcement. Stored as `"1"` for permanent dismiss, or as a millisecond timestamp when `dismissCooldownDays` is set (cleared once the cooldown expires). |

## Public API

```js
window.__announcement.show()    // re-build and show
window.__announcement.hide()    // hide without persisting
window.__announcement.reset()   // clear dismiss flag and re-show
window.__announcement.config    // resolved config (read-only)
```

## Versioning

`VERSION` constant lives at the top of `announcement-bar.js`.
