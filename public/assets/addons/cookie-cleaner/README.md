# Cookie Cleaner — portable consent enforcement

A drop-in folder. Closes the gap that `/consent/` alone leaves: it
stores the user's preferences but doesn't enforce them against cookies
that third-party scripts set anyway. This addon reads the consent
state and deletes any cookies that match denied categories — on load,
on consent change, and on a periodic interval to catch late-setters.

No CSS — purely behavioral.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest (no CSS, just JS). |
| `cookie-cleaner.js` | Pattern compilation, consent state lookup, cookie enumeration + cross-domain/path deletion, periodic rescan. |
| `README.md` | This file. |

## Integration

Enable in `site.json` with a category-pattern map:

```json
"addons": {
  "cookie-cleaner": {
    "enabled": true,
    "json": [{
      "id": "aed-cookie-cleaner",
      "data": {
        "always": ["theme", "aed:.*"],
        "categories": {
          "analytics": ["_ga", "_ga_.*", "_gid", "_gcl_.*", "ph_.*", "amplitude_.*", "plausible_.*"],
          "marketing": ["_fbp", "fr", "li_.*", "MUID", "ads_.*", "tt_.*", "_pin_.*"]
        }
      }
    }]
  }
}
```

Each pattern is a regex string anchored to the full cookie name (the
addon wraps it in `^...$`). Use `.*` for wildcards.

## Categories

The category keys must match `/consent/`'s schema:

- `necessary` — never deleted (always granted)
- `analytics` — typical: GA, PostHog, Amplitude, Plausible *if you set
  cookies via their script* (cookieless mode is fine to leave loaded)
- `marketing` — Facebook Pixel, LinkedIn Insight, Microsoft Clarity,
  TikTok Pixel, Pinterest tag, etc.

Add custom categories if your `/consent/` config has them — pattern
arrays must use the same key names.

## Always-keep

Cookies matching `always` patterns are *never* deleted, regardless of
consent. Use for:

- Your own first-party UX preferences (theme, language)
- The consent record itself (`aed:consent`)
- Session cookies your app needs to function

The default `always` list in your config should at minimum include
`["theme", "aed:.*"]` to preserve theme + the addon family's internal state.

## Behavior

- **First scan**: runs after `aed:consent:ready` fires (so consent
  state is loaded). Skips entirely if `/consent/` isn't installed
  (treats every cookie as keep — safe default, no surprises).
- **Re-scan triggers**:
  - `aed:consent:change` — user toggled prefs
  - 30-second interval while the tab is visible (catches scripts that
    re-set cookies after initial purge)
- **Deletion strategy**: writes the cookie back with an expiry in
  1970, across common path (`/`) + domain variants (host + each parent
  subdomain). Browsers honor whichever combination matches.
- **Console log**: when cookies are purged, the addon logs a short
  `[aed:cookie-cleaner] purged [...]` info message for staff
  visibility. Production users won't see this.

## Public API

```js
window.__cookieCleaner.scan()              // run a purge now
window.__cookieCleaner.list()              // all current cookie names
window.__cookieCleaner.shouldKeep('_ga')   // boolean given current consent
```

## Limits

- **HttpOnly cookies** can't be read or deleted from JavaScript. If a
  third-party script sets HttpOnly cookies, this addon can't enforce
  them — block the script via `/consent/`'s `data-consent-src`
  gating instead.
- **Cookies with explicit path/domain** the addon doesn't try are
  deletion-resistant. The addon attempts host + each parent subdomain
  with path `/` — this covers ~95% of cases. For the rest, document
  the cookie's path in your config and reconfigure the deletion logic
  if needed.

## Versioning

`VERSION` constant lives at the top of `cookie-cleaner.js`.
