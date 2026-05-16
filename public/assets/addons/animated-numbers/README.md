# Animated Numbers — portable count-up

A drop-in folder. Animates the textContent of any element with
`[data-aed-count-to]` from a start value (default `0`) to a target,
triggered by IntersectionObserver when 40% of the element scrolls into
view. Single-fire by default. ~80 lines of code.

## What's in this folder

| File | Role |
|---|---|
| `animated-numbers.css` | Hook classes (`.aed-counting`, `.aed-counted`) for optional flourishes. Almost empty by design. |
| `animated-numbers.js` | Format inference, easing, IntersectionObserver, single-fire / replay modes. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/animated-numbers/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/animated-numbers/animated-numbers.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/animated-numbers/animated-numbers.js"></script>
```

### Step 4 — mark numbers to animate

```html
<!-- Simplest: target value only -->
<span data-aed-count-to="100">0</span>

<!-- Auto-format inferred from existing content -->
<span data-aed-count-to="1234567">1,234,567</span>     <!-- comma separator -->
<span data-aed-count-to="2500" >$0</span>              <!-- $ prefix kept -->
<span data-aed-count-to="50">0+</span>                 <!-- + suffix kept -->
<span data-aed-count-to="3.14">0.00</span>             <!-- 2 decimals -->

<!-- Explicit overrides -->
<span data-aed-count-to="100"
      data-aed-count-from="20"
      data-aed-count-duration="2000"
      data-aed-count-prefix="~"
      data-aed-count-suffix=" projects">~20 projects</span>

<!-- Replay every time it re-enters viewport (rare; default is single-fire) -->
<span data-aed-count-to="100" data-aed-count-replay>0</span>
```

### Format inference

When you don't pass an explicit attribute, the addon looks at the
element's existing text and the target value to infer the format:

| Inference | Trigger |
|---|---|
| Comma thousands separator | existing text matches `\d,\d{3}` (e.g. `1,234`) |
| Decimal precision | target has decimals (e.g. `3.14` → 2 decimals) |
| Currency prefix | text starts with `$`, `£`, `€`, `¥`, or `₹` |
| Suffix | text ends with `%`, `+`, `k`, `K`, `M`, or `x` |

Any explicit `data-aed-count-*` attribute overrides inference for that
field.

## Site-wide auto-promotion (optional)

Instead of marking each number individually, you can declare a CSS
scope in a `<meta>` and the addon will promote any element whose
textContent parses to a number into a count-up target. Existing
`data-aed-count-to` attributes win, so you can still override
per-element.

```html
<meta name="aed:animated-numbers" content="on"
      data-auto-scope=".stat-num, .metric-value"
      data-default-duration="1800">
```

| Meta attribute | Purpose |
|---|---|
| `data-auto-scope` | CSS selector for elements to auto-promote (e.g. `.stat-num, .hero-metric`) |
| `data-default-duration` | Default `data-aed-count-duration` applied to auto-promoted elements (per-element attr still wins) |

Numbers are parsed as the first numeric run in the text (`-?\d[\d,]*(?:\.\d+)?`), so `"20+"`, `"$1,234"`, `"3.14"`, and `"50%"` all work — the prefix/suffix is inferred from the original text exactly as with manual usage.

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-count-to` | (required) | Target value |
| `data-aed-count-from` | `0` | Starting value |
| `data-aed-count-duration` | `1500` (ms) | Animation duration |
| `data-aed-count-decimals` | inferred | Decimal places |
| `data-aed-count-separator` | inferred | Thousands separator (`","`, `"."`, `" "`, etc.) |
| `data-aed-count-prefix` | inferred | Text before the number |
| `data-aed-count-suffix` | inferred | Text after the number |
| `data-aed-count-replay` | absent | Animate every time it re-enters viewport (default: single-fire) |

## Behavior

- **Trigger**: IntersectionObserver with `threshold: 0.4` — the element
  must be at least 40% visible.
- **Single-fire**: after the first run, the observer disconnects unless
  `data-aed-count-replay` is set.
- **Initial paint**: shows `from` value immediately so users never see
  the final number flash before the animation starts.
- **Easing**: ease-out cubic — feels natural for counters (fast start,
  slow finish).
- **Tabular numerals**: addon CSS sets `font-variant-numeric:
  tabular-nums` so digit widths stay constant during animation (no
  jittery layout shift).
- **Reduced motion**: `prefers-reduced-motion: reduce` skips the
  animation entirely — element shows the target value immediately.

## Optional flourish

Add a settle effect via your own CSS:

```css
.aed-counted { animation: pop 0.4s ease both; }
@keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
```

## Public API

```js
window.__counters.refresh()    // re-scan after inserting more elements
window.__counters.run(el)      // manually trigger a count-up
```

## Versioning

`VERSION` constant lives at the top of `animated-numbers.js`.
