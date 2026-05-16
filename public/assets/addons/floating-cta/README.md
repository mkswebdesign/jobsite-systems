# Floating CTA — drop-in scroll-revealed call-to-action

A drop-in folder. Bottom-right pill on desktop (full-width bar on mobile)
that fades in once the visitor scrolls past part of the first viewport.
Links to a configured destination (typically a request-form / start page).
Per-session dismissable via a small × button.

## What's in this folder

| File | Role |
|---|---|
| `floating-cta.css` | Pill, dismiss button, mobile bar variant. Theme-aware via `--accent`, `--accent-rgb`, `--bg-primary`. |
| `floating-cta.js`  | Reveal-on-scroll, optional JSON config, sessionStorage dismissal, path allow/deny. |
| `README.md`        | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/assets/addons/floating-cta/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/assets/addons/floating-cta/floating-cta.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/assets/addons/floating-cta/floating-cta.js"></script>
```

That's the whole install. With no config, it shows on every page (except
`/start/`), reveals after ~60% of viewport scroll, and links to `/start/`
labeled "Get Started".

### Step 4 — (optional) override config

Emit a JSON block before the script tag:

```html
<script type="application/json" id="aed-floating-cta-config">
{
  "href": "/contact/",
  "label": "Request a Quote",
  "hint": "Free 15-minute call",
  "showOnPaths": ["/", "/services/"],
  "hideOnPaths": ["/contact/", "/start/"],
  "revealAfterRatio": 0.4,
  "dismissable": true
}
</script>
```

## Brand-runtime config (arich-astro)

In a brand's `site.json`:

```json
"floating-cta": {
  "enabled": true,
  "json": [
    {
      "id": "aed-floating-cta-config",
      "data": {
        "href": "/start/",
        "label": "Start Your Site",
        "hint": "Tell us about your project",
        "showOnPaths": ["/"]
      }
    }
  ]
}
```

## Config reference

| Key | Default | Notes |
|---|---|---|
| `href` | `/start/` | Destination URL. |
| `label` | `Get Started` | Primary label. |
| `hint` | `Tell us about your project` | Sub-label (desktop only). |
| `showOnPaths` | `[]` | If non-empty, only show on these exact paths. |
| `hideOnPaths` | `["/start/"]` | Always-hide list — typically the destination. |
| `revealAfterRatio` | `0.6` | Fraction of viewport height before reveal. |
| `revealAfterMin` | `360` | Minimum scroll px before reveal. |
| `dismissable` | `true` | Show the per-session × dismiss button. |

## Public API

```js
window.__floatingCta.config    // resolved config (read-only)
window.__floatingCta.dismiss() // hide + remember for the rest of the session
window.__floatingCta.reset()   // clear the session dismissal flag
```
