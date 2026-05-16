# Copy Quote — portable "select text → copy with attribution"

A drop-in folder. When the user selects text inside a configured scope,
a small floating "Copy as quote" button appears above the selection.
Click → copies the selection with attribution + source URL.

Off on touch devices by default (mobile already has a native selection
toolbar). Opt back in via `data-touch="on"` if you want both.

## What's in this folder

| File | Role |
|---|---|
| `copy-quote.css` | Floating pill button styles, theme-aware. |
| `copy-quote.js` | Selection tracking, button positioning, format templating, brand inference, clipboard with execCommand fallback. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/addons/copy-quote/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/addons/copy-quote/copy-quote.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/addons/copy-quote/copy-quote.js"></script>
```

### Step 4 — opt in with a `<meta>` tag

```html
<meta name="aed:copy-quote" content="auto" />

<!-- With overrides -->
<meta name="aed:copy-quote" content="auto"
      data-scope="article, .case-study"
      data-min="20"
      data-template='"{text}" — {brand} ({url})'
      data-touch="off" />
```

Without the meta tag, the addon does nothing.

## Meta attributes

| Attribute | Default | Purpose |
|---|---|---|
| `content` | required (`auto`/`on`/`true`/`1`) | Enables the addon |
| `data-scope` | `"article, main"` | CSS selector for containers where selection triggers the button |
| `data-min` | `20` | Minimum selection length (chars) before button appears |
| `data-template` | `'"{text}"\n— {brand} ({url})'` | Format string. Supports `{text}`, `{brand}`, `{url}`, `{title}`, and literal `\n`. |
| `data-touch` | `"off"` | Set to `"on"` to also activate on touch devices |

## Brand inference

When the `{brand}` token is in the template, the addon resolves it
from:

1. `<meta property="og:site_name" content="…">` — preferred
2. The first segment of `document.title` (split on `|` or `—`)
3. Fallback: literal `"this site"`

So a tag like `<meta property="og:site_name" content="gomks">` makes
every quote attribute correctly without per-page wiring.

## Behavior

- **Selection-driven**: addon listens to `selectionchange` events and
  `mousedown` (then re-checks). The button positions above the
  selection, or below if the selection is near the top of the viewport.
- **Scoped**: the selection's start or end node must match one of the
  scope selectors. Selection in nav / footer / unrelated UI is
  ignored.
- **Min length**: short selections (< `data-min` chars) skip the
  button — keeps single-word highlights from triggering it.
- **Auto-hides**: on scroll, on resize, when selection clears.
- **Touch devices**: hidden by default. Opt in with `data-touch="on"`.
- **Print mode**: hidden in `@media print`.
- **Clipboard fallback**: uses `navigator.clipboard.writeText()` with
  hidden-textarea + `execCommand('copy')` for older browsers.

## Public API

```js
window.__copyQuote.format("Some text")  // returns the templated string
window.__copyQuote.refresh()            // re-evaluate selection now
window.__copyQuote.hide()
```

## Versioning

`VERSION` constant lives at the top of `copy-quote.js`.
