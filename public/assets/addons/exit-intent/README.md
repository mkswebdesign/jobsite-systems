# Exit Intent — portable last-chance modal

A drop-in folder. Detects when a visitor signals they're about to leave
the page (desktop: mouse exits the top of the viewport; mobile: scroll-up
burst after a dwell) and shows a single configurable modal once per
session. Plays nicely with the rest of the addon family.

## What's in this folder

| File | Role |
|---|---|
| `exit-intent.css` | Centered modal scrim + dialog. Theme-aware. |
| `exit-intent.js` | Dwell + scroll-engagement gating, mouse + touch detection, modal render, suppression when other overlays are open, sessionStorage / localStorage persistence. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/exit-intent/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/exit-intent/exit-intent.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/exit-intent/exit-intent.js"></script>
```

### Step 4 — opt in with a `<meta>` tag

```html
<meta name="aed:exit-intent" content="on" />
```

Without this, the script does nothing. Default is off — exit-intent is
intrusive and shouldn't appear on a brand that didn't ask for it.

### Step 5 — (optional) configure the modal

```html
<script type="application/json" id="aed-exit-intent-config">
{
  "eyebrow": "Wait",
  "headline": "Before you go…",
  "body": "Got 15 minutes? Pick a slot — no pitch, no pressure.",
  "primary": { "label": "Book a call", "href": "javascript:void(__booking.open())" },
  "secondary": { "label": "No thanks", "dismiss": "permanent" },
  "dwellMs": 4000,
  "minScrollPercent": 25,
  "hideOnPaths": ["/contact/", "/thanks/", "/start/"]
}
</script>
```

| Field | Default | Purpose |
|---|---|---|
| `eyebrow` | `"Wait"` | Tiny pill above the headline. Set `null` to hide. |
| `headline` | `"Before you go…"` | Main heading |
| `body` | `"Got 30 seconds? …"` | Body paragraph |
| `primary` | `{ label: "Learn more", href: "/" }` | Primary CTA. `href` may be a regular URL or `javascript:` to call other addon APIs (e.g. open booking). |
| `secondary` | `{ label: "No thanks", dismiss: "session" }` | Secondary action. `dismiss: "session"` closes the modal; `"permanent"` writes localStorage to never show again on this device. Omit for a normal link. |
| `dwellMs` | `4000` | Wait this long after page load (or after consent answered) before arming detection |
| `minScrollPercent` | `0` | Require this much page-scroll engagement (0–100) before arming. Useful for filtering out drive-bys. |
| `hideOnPaths` | `["/contact/", "/thanks/", "/start/"]` | Paths where the modal should not arm at all |

## Detection

| Trigger | Surface | Behavior |
|---|---|---|
| `mouseleave` with `clientY <= 0` | Desktop | Mouse moves up off the viewport into chrome / tabs / address bar. The classic exit-intent signal. |
| Scroll-up burst (≥12px in <300ms) near top | Mobile (touch) | Stand-in for "user reaching for the back button." Only triggers when scroll position is within 80px of top, so reading-flow scrolls don't false-fire. |

Both surfaces also require:

- **Dwell**: at least `dwellMs` since arming began.
- **Engagement**: scroll depth at least `minScrollPercent`.
- **Single-fire**: not already triggered this session.
- **Not permanently dismissed** in localStorage.
- **No other overlay open**: consent banner, contact-fab panel, booking
  modal, or a just-shown form-success card → all suppress the trigger.

## Coordination with `/consent/`

If the consent banner is showing on page load, exit-intent's arming
window doesn't begin until the user answers. Avoids stacking modals on
first-visit users.

## Storage

| Key | Storage | Purpose |
|---|---|---|
| `aed:exit-intent:fired` | sessionStorage | Modal has shown once this tab session |
| `aed:exit-intent:dismissed` | localStorage | User chose "permanent" dismiss — never show again on this device |

## Public API

```js
window.__exitIntent.show()    // force-open (also sets the session fuse)
window.__exitIntent.hide()
window.__exitIntent.reset()   // wipe both flags and re-arm
window.__exitIntent.config    // resolved config (read-only)
```

## Events on `document`

```js
document.addEventListener('aed:exit-intent:trigger', (e) => {
  // e.detail.reason: 'mouseleave-top' | 'scroll-up-mobile'
  plausible('Exit Intent', { props: { reason: e.detail.reason } });
});
```

## Versioning

`VERSION` constant lives at the top of `exit-intent.js`. Bump on change.
