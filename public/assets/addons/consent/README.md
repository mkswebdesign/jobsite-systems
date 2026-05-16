# Consent — portable cookie / privacy preferences

A drop-in folder. Copy `public/addons/consent/` to another site's `public/`
directory, link the CSS, defer the JS, and you have a banner + customize
modal that fires events any other add-on can listen for.

## What's in this folder

| File | Role |
|---|---|
| `consent.css` | Banner (bottom-fixed card) + customize modal + toggle switches. Theme-aware via `--bg-card`, `--accent`, etc. |
| `consent.js` | State machine, storage, banner / modal UI, public API, event bus, auto-gate for third-party scripts. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/consent/` into your new site's `public/` directory. Your
build tool should serve these files at `/addons/consent/consent.css` and
`/addons/consent/consent.js`.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/consent/consent.css" />
```

It's tiny and only paints when the banner / modal is open, so loading
unconditionally is fine.

### Step 3 — load `consent.js` before `</body>`

```html
<script defer src="/addons/consent/consent.js"></script>
```

### Step 4 — (optional) add a footer trigger

```html
<a href="#" data-consent-open>Cookie preferences</a>
```

`consent.js` finds every `[data-consent-open]` and wires it to open the
customize modal.

### Step 5 — (optional) override copy / categories

Drop an inline JSON config block anywhere on the page (typically in
`<head>` or just before the script). It's read at boot.

```html
<script type="application/json" id="aed-consent-config">
{
  "copy": {
    "bannerTitle": "Cookies on this site",
    "bannerBody": "We use a single cookie to remember your theme choice. Optional analytics help us improve.",
    "privacyLink": "/privacy/"
  },
  "categories": [
    { "id": "analytics", "name": "Anonymous analytics",
      "desc": "Plausible — no cross-site tracking, no personal data." }
  ]
}
</script>
```

Only categories that already exist (`necessary`, `analytics`, `marketing`)
can be overridden — you can rename / re-describe them, not invent new ones.

## Auto-gating third-party scripts

To gate a script on a category, change `src` to `data-consent-src` and
add `data-aed-consent="<category>"`. The script does nothing until the
user grants the category, at which point `consent.js` re-injects it with
the real `src` and the browser loads it.

```html
<!-- Plausible only loads if user grants analytics -->
<script defer
        data-aed-consent="analytics"
        data-consent-src="https://plausible.io/js/script.js"
        data-domain="example.com"></script>
```

The script is also activated automatically on subsequent visits if the
user previously granted the category (the choice persists in
`localStorage`).

## Public API

```js
window.__consent.get('analytics')        // true | false
window.__consent.getAll()                // { necessary, analytics, marketing }
window.__consent.set({ analytics: true }) // partial update + persist + emit
window.__consent.acceptAll()             // grant everything + close banner
window.__consent.rejectAll()             // deny everything except necessary
window.__consent.open()                  // open customize modal
window.__consent.reset()                 // wipe + reshow banner (testing)
window.__consent.onChange(fn)            // returns unsubscribe()
```

## Events on `document`

```js
document.addEventListener('aed:consent:ready', (e) => {
  // e.detail = { choices, hasChosen }
  // Fires once after boot. Use to bootstrap consent-dependent code.
});

document.addEventListener('aed:consent:change', (e) => {
  // e.detail = { choices, prev }
  // Fires every time the user updates their choices.
  if (e.detail.choices.analytics && !e.detail.prev.analytics) {
    // Granted analytics for the first time — start tracking.
  }
});
```

## Storage

| Key | Storage | Format |
|---|---|---|
| `aed:consent` | localStorage | `{ "v": 1, "ts": "<iso>", "choices": { … } }` |

`v` is the policy version baked into `consent.js`. Bump it (`POLICY_VERSION`
constant at the top of the file) after a material change to your privacy
practices — existing users will get re-prompted.

Namespaced with `aed:` to match `/theme/`, `/editor/`, `/print-mode/`.

## Default categories

| id | Locked | Default | Purpose |
|---|---|---|---|
| `necessary` | yes | on | Site function (theme, consent itself, etc.) |
| `analytics` | no | off | Anonymous usage data |
| `marketing` | no | off | Ad / retargeting / pixels |

## Versioning

The runtime `VERSION` constant lives at the top of `consent.js`. Bump it
when you ship a code change. Bump `POLICY_VERSION` separately when the
*meaning* of consent changes — that one re-prompts users.
