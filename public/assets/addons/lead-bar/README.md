# Lead Bar — portable conversion CTA

A drop-in folder. Sticky bottom bar with a phone CTA + secondary action.
Opt-in per site via one `<meta>` tag. Auto-detects the phone from your
existing `<a href="tel:...">` so you don't have to repeat the number.

## What's in this folder

| File | Role |
|---|---|
| `lead-bar.css` | Bottom-anchored bar styles. Theme-aware. Mobile = full-width strip; desktop = centered pill. Coordinates with the consent banner via CSS `:has`. |
| `lead-bar.js` | Reads opt-in meta, optional JSON config, auto-detects phone, builds markup, handles dismiss + scroll-trigger, defers reveal until consent banner is answered. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/lead-bar/` into your `public/` directory. Files served at
`/addons/lead-bar/lead-bar.css` and `/addons/lead-bar/lead-bar.js`.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/lead-bar/lead-bar.css" />
```

### Step 3 — load `lead-bar.js` before `</body>`

```html
<script defer src="/addons/lead-bar/lead-bar.js"></script>
```

### Step 4 — opt in with a `<meta>` tag

```html
<meta name="aed:lead-bar" content="on" />
```

Without this tag, the script does nothing — there's no risk of an
unwanted floating bar appearing on a brand that wasn't opted in.

### Step 5 — (optional) override config

Anywhere on the page, drop an inline JSON block. All fields optional.

```html
<script type="application/json" id="aed-lead-bar-config">
{
  "phone": "+15125550188",
  "phoneLabel": "Call now",
  "cta": { "href": "/start/", "label": "Get a quote" },
  "hideOnPaths": ["/contact/", "/start/"],
  "showAfter": 400,
  "dismissable": true
}
</script>
```

| Field | Default | Purpose |
|---|---|---|
| `phone` | first `<a href="tel:...">` on the page | Phone the bar links to. Wins over email if set. |
| `email` | first `<a href="mailto:...">` if no phone | Used as primary CTA when no phone is configured/found. |
| `phoneLabel` | `"Call now"` | Small uppercase label above the number on desktop |
| `emailLabel` | `"Email us"` | Small uppercase label when the primary is email |
| `cta.href` / `cta.label` | `/contact/` / `"Get a quote"` | Secondary action (omit `cta` to hide) |
| `hideOnPaths` | `["/contact/"]` | Path prefixes where the bar should not show |
| `showAfter` | `0` | Px scrolled before the bar appears (`0` = immediate) |
| `dismissable` | `true` | Show the X dismiss button |

## Behavior

- **Auto-detect**: with no `phone` configured, the script grabs the first
  `<a href="tel:...">` it finds — typically your nav or footer. Update the
  number once, the bar follows.
- **Hide-on-path**: never shown on `/contact/` (CTA would be redundant).
  Override with `hideOnPaths`.
- **Dismiss**: clicking the X hides the bar for the rest of the tab
  session (sessionStorage). Comes back next visit — gentle nudge, not
  hostile.
- **Consent coordination**: if a consent banner is open, the bar waits
  for the user to answer before showing. Once visible, CSS `:has` slides
  the bar up so it never overlaps the consent banner.
- **Print mode**: the bar hides automatically in `@media print`.
- **Reduced motion**: animations are softened when
  `prefers-reduced-motion: reduce`.

## Storage

| Key | Storage | Purpose |
|---|---|---|
| `aed:lead-bar:dismissed` | sessionStorage | User dismissed this tab session |

Namespaced with `aed:` to match the rest of the drop-in family.

## Public API

```js
window.__leadBar.show()          // force-show (ignores dismiss flag)
window.__leadBar.hide()          // hide without persisting
window.__leadBar.dismiss()       // hide + persist for the session
window.__leadBar.reset()         // clear dismiss flag and re-show
window.__leadBar.config          // current resolved config (read-only)
```

## Track conversions

The phone link carries `data-aed-lead="phone"` and the secondary CTA
carries `data-aed-lead="cta"`. With Plausible:

```js
plausible('Lead Bar Click', { props: { kind: 'phone' } });
```

…or use Plausible's tagged-events script and add
`class="plausible-event-name=Lead+Bar+Phone"` in a custom build.

## Versioning

The runtime `VERSION` constant lives at the top of `lead-bar.js`. Bump
it when you ship a change.
