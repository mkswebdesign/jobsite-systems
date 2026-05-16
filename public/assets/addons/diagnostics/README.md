# Diagnostics — portable staff perf overlay

A drop-in folder. Adds a keystroke-toggled (`Ctrl+Shift+D` /
`Cmd+Shift+D`) overlay panel showing live Web Vitals and quick perf
signals. For staff diagnosis of production pages without DevTools.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `diagnostics.css` | Fixed-corner panel, threshold-color rows. Theme-aware. |
| `diagnostics.js` | PerformanceObserver wiring, threshold mapping, render, hotkey toggle. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "diagnostics": { "enabled": true } }
```

Then press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to open the panel
on any page.

## What it shows

| Row | Source | Color thresholds |
|---|---|---|
| **LCP** | `largest-contentful-paint` PO entries | Good < 2.5s · Warn < 4s · Poor ≥ 4s |
| **CLS** | `layout-shift` PO entries (excluding hadRecentInput) | Good < 0.1 · Warn < 0.25 · Poor ≥ 0.25 |
| **INP** | `event` PO entries (Chromium) | Good < 200ms · Warn < 500ms · Poor ≥ 500ms |
| **TTFB** | navigation timing `responseStart` | (no threshold) |
| **Conn** | `navigator.connection.effectiveType` (+ `saver` if data-saver on) | — |
| **DPR** | `window.devicePixelRatio` | — |
| **Viewport** | `innerWidth × innerHeight` | — |
| **DOM** | `document.getElementsByTagName('*').length` | — |
| **JS heap** | `performance.memory.usedJSHeapSize` (Chromium only) | — |

The panel re-renders every 2s while visible so late metrics (INP,
slow CLS shifts) update without a manual refresh.

## Gating

This addon does no IP gating — keystroke obscurity is the gate. The
hotkey isn't user-discoverable, but anyone who reads the source can
trigger it. Don't enable on a high-stakes brand if you don't want
curious visitors looking at Web Vitals.

For stricter gating, scope the addon by IP using the same pattern as
`/editor/`'s `bootstrap.js` (move the keydown listener inside an IP
check fetch).

## Public API

```js
window.__diag.toggle()       // show / hide
window.__diag.show()
window.__diag.hide()
window.__diag.snapshot()     // → current metrics object
```

## Versioning

`VERSION` constant lives at the top of `diagnostics.js`.
