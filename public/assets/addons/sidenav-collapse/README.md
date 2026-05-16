# Sidenav Collapse — portable collapsible nav groups

A drop-in folder. Wraps a `<nav data-aed-sidenav>` containing
`<details class="aed-sn-group">` blocks in a sidebar-style collapsible
nav. Persistent open/close state per group via localStorage. Active
link auto-detected by URL match — its parent group auto-opens.

For documentation sites, multi-section staff dashboards, anywhere with
many grouped links.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `sidenav-collapse.css` | Group / summary / list / link styling, active state, chevron rotation. Theme-aware. |
| `sidenav-collapse.js` | localStorage persistence, URL-based active-link detection, auto-open parent group of active link. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "sidenav-collapse": { "enabled": true } }
```

## Markup

```html
<nav data-aed-sidenav data-aed-sidenav-key="docs">
  <details class="aed-sn-group" data-aed-sn-group="getting-started" open>
    <summary>Getting started</summary>
    <ul class="aed-sn-list">
      <li><a href="/docs/install/">Install</a></li>
      <li><a href="/docs/quickstart/">Quickstart</a></li>
      <li><a href="/docs/configuration/">Configuration</a></li>
    </ul>
  </details>

  <details class="aed-sn-group" data-aed-sn-group="reference">
    <summary>Reference</summary>
    <ul class="aed-sn-list">
      <li><a href="/docs/api/">API</a></li>
      <li><a href="/docs/cli/">CLI</a></li>
    </ul>
  </details>

  <details class="aed-sn-group" data-aed-sn-group="recipes">
    <summary>Recipes</summary>
    <ul class="aed-sn-list">
      <li><a href="/docs/recipes/auth/">Auth flows</a></li>
      <li><a href="/docs/recipes/deploy/">Deploys</a></li>
    </ul>
  </details>
</nav>
```

The structure uses native `<details>` + `<summary>` so the nav works
without JS — collapse / expand still happens, you just lose the active
link detection and persistence.

## Per-container attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-sidenav` | required | Marks the nav |
| `data-aed-sidenav-key` | `default` | localStorage key prefix — separate sidenavs on the same site can have independent state |

## Per-group attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-sn-group` | required | Unique id within the sidenav |
| `open` | absent | Native HTML attribute — initial state when no localStorage entry exists |

## Behavior

- **State persistence**: each group's open/close state writes to
  `localStorage` under `aed:sidenav:<key>:<group>`. Restored on next
  visit.
- **Active link detection**: walks all anchor children, finds the one
  whose path is the longest match against `window.location.pathname`,
  marks it `.is-active` and force-opens its parent group. Beats
  manual maintenance.
- **Native fallback**: works without JS — `<details>` collapse is
  built in. JS just adds the persistence and active-state polish.
- **Reduced motion**: chevron rotation transition disabled.

## Public API

```js
window.__sidenav.refresh()    // re-scan after dynamic insert
```

## Versioning

`VERSION` constant lives at the top of `sidenav-collapse.js`.
