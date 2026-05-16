# Breadcrumbs — portable URL-derived trail + SEO schema

A drop-in folder. Hydrates `<nav data-aed-breadcrumbs>` with a
breadcrumb trail derived from the current URL path. Also emits one
`BreadcrumbList` JSON-LD `<script>` per page for SEO — automatically.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest declaring CSS + JS for the dynamic loader. |
| `breadcrumbs.css` | Inline trail styles, separator, current-page emphasis. Theme-aware. |
| `breadcrumbs.js` | URL parsing, label resolution (config → page meta → titlecase), render, `BreadcrumbList` schema emission. |
| `README.md` | This file. |

## Integration

Enable in `site.json` under `addons.breadcrumbs`:

```json
"addons": {
  "breadcrumbs": {
    "enabled": true,
    "json": [{
      "id": "aed-breadcrumbs",
      "data": {
        "home": { "label": "Home", "href": "/" },
        "separator": "/",
        "labels": {
          "/internal-fork/": "Internal · Fork Guide",
          "/internal-fork/options/": "Editor Options",
          "/work/": "Selected Work"
        }
      }
    }]
  }
}
```

Drop a placeholder anywhere in your page (typically just below the page
header):

```astro
<nav data-aed-breadcrumbs></nav>

<!-- Mute variant for tucking into a footer / sidebar -->
<nav data-aed-breadcrumbs data-aed-variant="ghost"></nav>

<!-- Disable JSON-LD emission for this trail (rare) -->
<nav data-aed-breadcrumbs data-aed-skip-schema="true"></nav>
```

## Label resolution

For each URL segment (in order):

1. Exact match in `config.labels` (with or without trailing slash)
2. For the current page only: `<meta name="aed:breadcrumbs:label" content="...">`
3. Titlecase of the URL segment (`internal-fork` → `Internal Fork`)

Home is always the first crumb, configured by `home` (default
`{ label: "Home", href: "/" }`).

## Schema emission

The first `[data-aed-breadcrumbs]` on the page (unless tagged
`data-aed-skip-schema="true"`) triggers a single `<script
type="application/ld+json">` insertion in `<head>` with a complete
`BreadcrumbList` covering the current URL. Google + LLMs will pick this
up.

The schema is emitted even when no visible breadcrumb element exists
on the page — just include the JSON config block in `site.json` and
the schema lands. To suppress everywhere, omit the addon from
`site.json` instead.

Wait — for schema-only emission without a visible trail, the addon
needs a hidden anchor element. Ship a hidden one:

```astro
<nav data-aed-breadcrumbs hidden></nav>
```

This makes the JSON-LD emit while keeping the visual trail off.

## Per-page meta override

Useful when the URL segment alone doesn't make a great label:

```html
<head>
  <meta name="aed:breadcrumbs:label" content="The /new-brand prompt format">
</head>
```

This only affects the *current* (last) crumb; intermediate segments
fall back to the config map.

## Per-element variants

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-breadcrumbs` | (required) | Marks the placeholder |
| `data-aed-variant` | (default) | `ghost` mutes all colors |
| `data-aed-skip-schema` | `false` | Set `"true"` to skip JSON-LD emission |

## Public API

```js
window.__breadcrumbs.refresh()   // re-render all placeholders
window.__breadcrumbs.trail()     // array of { href, label, current }
```

## Versioning

`VERSION` constant lives at the top of `breadcrumbs.js`.
