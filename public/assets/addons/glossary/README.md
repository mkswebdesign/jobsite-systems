# Glossary — portable hover-tooltip definitions

A drop-in folder. Marks `<dfn data-aed-glossary>API</dfn>` terms with a
dotted underline and shows the definition in a popup on hover (desktop)
or tap (touch). Definitions live in a single JSON dictionary in
`site.json`.

Onboards readers to your domain vocabulary without breaking flow or
sending them to a separate glossary page.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `glossary.css` | Dotted underline marker, popup styles. Theme-aware. |
| `glossary.js` | Dictionary load, popup positioning + flip, hover/focus/tap interaction. |
| `README.md` | This file. |

## Integration

Enable in `site.json` with your dictionary:

```json
"addons": {
  "glossary": {
    "enabled": true,
    "json": [{
      "id": "aed-glossary",
      "data": {
        "API":  "Application Programming Interface — the contract a service exposes to other software.",
        "CMS":  "Content Management System — admin software for editing content (e.g. WordPress).",
        "WCAG": "Web Content Accessibility Guidelines — the accessibility spec we build to.",
        "CDN":  "Content Delivery Network — a global cache layer that serves your static files from a location near each visitor."
      }
    }]
  }
}
```

Then mark terms inline in your content:

```html
<p>
  We don't use a <dfn data-aed-glossary>CMS</dfn>. Sites are built static
  and delivered via <dfn data-aed-glossary>CDN</dfn>, which is part of why
  page loads stay sub-second even at scale.
</p>

<!-- Override the term key independently of the visible text -->
<p>
  Want to integrate? Reach out and we'll publish the
  <dfn data-aed-glossary="API">programmatic interface</dfn>.
</p>
```

## Per-element attribute

| Attribute | Behavior |
|---|---|
| `data-aed-glossary` (no value) | Term key = the element's text content (case-insensitive) |
| `data-aed-glossary="KEY"` | Term key = `"KEY"`, regardless of visible text |

Terms with no dictionary entry are silently left alone (no underline,
no popup).

## Behavior

- **Lookup is case-insensitive**: `<dfn data-aed-glossary>api</dfn>`
  matches dictionary key `"API"`.
- **Popup placement**: appears below the term by default; flips above
  if it would overflow the bottom; clamps to the right edge.
- **Hover / focus / tap**: desktop hovers + keyboard focus open the
  popup; touch devices tap-to-toggle.
- **Dismiss**: outside-click, scroll, or focus loss.
- **A11y**: term gets `tabIndex=0` and an `aria-label` containing the
  full definition (so screen readers don't depend on the popup).
- **Print mode**: dotted underline removed, popup hidden.

## Public API

```js
window.__glossary.lookup('CMS')   // → { key: 'CMS', def: '...' } or null
window.__glossary.refresh()
window.__glossary.show(el)
window.__glossary.hide()
```

## Versioning

`VERSION` constant lives at the top of `glossary.js`.
