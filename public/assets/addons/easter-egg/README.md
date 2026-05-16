# Easter Egg — portable Konami-code reveal panel

A drop-in folder. Listens for a key sequence (Konami code by default)
and pops up a small configurable panel — message, emoji, optional
CTAs. Tasteful personality, not a marketing banner.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `easter-egg.css` | Modal scrim, panel, buttons. Theme-aware. |
| `easter-egg.js` | Sequence detector, panel build, single-fire fuse (session / permanent / never). |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": {
  "easter-egg": {
    "enabled": true,
    "json": [{
      "id": "aed-easter-egg",
      "data": {
        "emoji": "🎉",
        "headline": "Caught us.",
        "body": "Here's 10% off your first three months as a thank you. Code: GOMKS-EGG-10",
        "primary":   { "label": "See pricing", "href": "/pricing/?promo=GOMKS-EGG-10" },
        "secondary": { "label": "No thanks", "dismiss": true },
        "sequence": "konami",
        "fireOnce": "session"
      }
    }]
  }
}
```

## Schema

| Field | Default | Purpose |
|---|---|---|
| `emoji` | `🎉` | Big emoji at top of panel (set `null` / `""` to hide) |
| `headline` | `You found it.` | Bold headline |
| `body` | (greeting copy) | Body paragraph |
| `primary` | `null` | `{ label, href, target?, dismiss? }` — primary action button |
| `secondary` | `{ label: "Cool", dismiss: true }` | Same shape — ghost button |
| `sequence` | `"konami"` | One of `"konami"`, `"iddqd"`, OR a custom string ("hello") OR an array of `KeyboardEvent.key` values |
| `fireOnce` | `"session"` | `"session"` (re-show next visit), `"permanent"` (never again on this device), `"never"` (re-show every match) |

## Sequences

| Token | Sequence |
|---|---|
| `konami` | ↑ ↑ ↓ ↓ ← → ← → b a |
| `iddqd` | i d d q d |
| Custom string | one char per `KeyboardEvent.key` (so `"hello"` = h, e, l, l, o) |
| Custom array | exact `KeyboardEvent.key` values (e.g. `["Escape", "Escape", "Enter"]`) |

## Behavior

- **Sequence detection**: tracks position through the sequence as
  keys come in. Mistyping resets — but if the wrong key happens to
  be the first key of the sequence, that's treated as a fresh start.
- **Single-fire**: respects `fireOnce`. Once fired in a given scope
  (session / device), subsequent matches still open the panel but
  don't re-mark anything.
- **Outside-click / Escape / X**: all dismiss.
- **A11y**: panel is `role="dialog"` + `aria-modal="true"` + labelled
  by the headline.
- **Reduced motion**: scale-in transition disabled.

## Public API

```js
window.__egg.show()       // force-open right now
window.__egg.hide()
window.__egg.reset()      // clear the fired flag (testing)
window.__egg.config       // resolved config (read-only)
```

## Versioning

`VERSION` constant lives at the top of `easter-egg.js`.
