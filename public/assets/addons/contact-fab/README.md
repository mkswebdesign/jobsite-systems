# Contact FAB — portable floating action button

A drop-in folder. Round button bottom-right that expands into a panel
of contact actions (call / email / message / custom). One-time welcome
speech bubble. Auto-discovers `tel:` and `mailto:` links from the page
so you don't have to repeat the brand's contact info.

## What's in this folder

| File | Role |
|---|---|
| `contact-fab.css` | FAB, welcome bubble, panel, action rows. Theme-aware. Coordinates with `/consent/` and `/lead-bar/` via CSS `:has` and body classes. |
| `contact-fab.js` | Auto-discovery, optional JSON config, panel build, open/close, escape + click-outside, welcome bubble timer, sessionStorage. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/contact-fab/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/contact-fab/contact-fab.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/contact-fab/contact-fab.js"></script>
```

That's the whole install. With no config, the script picks up the first
`<a href="tel:...">` and `<a href="mailto:...">` it finds (typically your
nav or footer) and offers them in the panel, plus a "Send a message"
entry pointing at `/contact/`.

### Step 4 — (optional) override config

```html
<script type="application/json" id="aed-contact-fab-config">
{
  "label": "Talk to us",
  "panelTitle": "How can we help?",
  "panelSubtitle": "Pick the channel that suits you.",
  "welcomeBubble": "Hi! Got a question?",
  "welcomeBubbleDelay": 4000,
  "hideOnPaths": ["/contact/"],
  "footer": "Reply usually within 4 business hours.",
  "actions": [
    { "kind": "phone",    "label": "Call us",     "sublabel": "(512) 555-0188", "href": "tel:+15125550188" },
    { "kind": "email",    "label": "Email us",    "sublabel": "hello@bluebird.com", "href": "mailto:hello@bluebird.com" },
    { "kind": "calendar", "label": "Book a call", "sublabel": "15-minute intro",     "href": "https://cal.com/anthony/15", "target": "_blank" },
    { "kind": "message",  "label": "Send a message",                                "href": "/contact/" }
  ]
}
</script>
```

| Field | Default | Purpose |
|---|---|---|
| `label` | `"Talk to us"` | aria-label / hover tooltip on the FAB |
| `panelTitle` / `panelSubtitle` | "How can we help?" / "Pick the channel…" | Header copy |
| `welcomeBubble` | `"Hi! Got a question?"` | One-time speech bubble. Set to `null` / `""` to disable. |
| `welcomeBubbleDelay` | `4000` | ms after page load before bubble appears |
| `hideOnPaths` | `["/contact/"]` | Path prefixes where the FAB should not show |
| `footer` | `null` | Optional small line at bottom of the panel |
| `actions` | `null` (auto-discover) | Explicit action list — overrides discovery entirely |
| `prependActions` | `null` | Actions added *above* the auto-discovered list |
| `appendActions` | `null` | Actions added *below* the auto-discovered list |

### Action shape

```ts
{
  kind?:    'phone' | 'email' | 'message' | 'calendar' | 'external' | string,
  icon?:    string,           // overrides the kind-based icon if set
  label:    string,
  sublabel?: string,
  href:     string,
  target?:  '_blank',
}
```

`kind` picks the icon (and for built-in kinds, sensible defaults). For a
custom icon, override `icon` with one of: `chat`, `phone`, `email`,
`message`, `calendar`, `external`, `plus`.

## Behavior

- **Auto-discovery**: scans the DOM for the first `<a href="tel:...">` and
  `<a href="mailto:...">`, prepends a "Send a message" → `/contact/` row.
  Override entirely by passing an explicit `actions` array.
- **Welcome bubble**: appears once per tab session after `welcomeBubbleDelay`
  ms. Click to open the panel; click X to dismiss. Sticky-orange pulse
  dot on the FAB while the bubble is showing.
- **Click-outside / Escape**: closes the panel.
- **Hide-on-path**: never shows on `/contact/` (CTA redundant). Configurable.
- **Consent coordination**: defers reveal until the user answers the
  consent banner.
- **Lead-bar coordination on mobile**: the FAB hides when the lead-bar is
  active on a mobile viewport, since they'd overlap. On desktop, both show
  (different corners).
- **Print**: hidden in `@media print`.
- **Reduced motion**: fade-only transitions, no pulse on the dot.

## Storage

| Key | Storage | Purpose |
|---|---|---|
| `aed:contact-fab:bubble-seen` | sessionStorage | Welcome bubble shown this tab |
| `aed:contact-fab:dismissed`   | sessionStorage | (Reserved for future "don't show again" option) |

## Public API

```js
window.__contactFab.open()    // open the panel
window.__contactFab.close()   // close
window.__contactFab.toggle()
window.__contactFab.reset()   // wipe sessionStorage flags
window.__contactFab.config    // resolved config (read-only)
```

## Upgrade notes (if replacing an existing widget)

If you previously had a single-link contact pill component:

- Remove the old component import + render from your layout.
- Remove the old `.contact-widget*` CSS rules from your global stylesheet.
- Drop in this folder + the two tags above.
- Per-brand contact info is auto-detected from existing nav/footer links —
  no migration of `site.contactWidget` required.

## Versioning

`VERSION` constant lives at the top of `contact-fab.js`. Bump on change.
