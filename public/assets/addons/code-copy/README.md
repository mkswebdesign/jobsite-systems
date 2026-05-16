# Code Copy — portable copy button for `<pre><code>`

A drop-in folder. Adds an absolutely-positioned Copy button (and an
optional language label) to every opted-in `<pre>` on the page.
Idempotent — safe to enable on pages that already have their own copy
mechanism.

## What's in this folder

| File | Role |
|---|---|
| `code-copy.css` | Button + language label positioning, theme-aware colors, copied-state animation. |
| `code-copy.js` | Mode gate (auto / opt-in), idempotent skip, language inference, clipboard with execCommand fallback. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/code-copy/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/code-copy/code-copy.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/code-copy/code-copy.js"></script>
```

### Step 4 — pick a mode

```html
<!-- Auto: every <pre> on the page gets a button -->
<meta name="aed:code-copy" content="auto" />

<!-- Opt-in: only <pre data-aed-code-copy> -->
<meta name="aed:code-copy" content="opt-in" />
```

Without a meta tag the addon does nothing.

### In auto mode, opt out per element

```html
<pre data-aed-code-copy="off">don't button me</pre>
```

## Language label inference

The label (top-right corner of the block) comes from any of:

```html
<code class="language-bash">…</code>     →  BASH
<code class="lang-json">…</code>         →  JSON
<pre data-language="ts">…</pre>          →  TS
```

If none of those match, no label is shown.

## Idempotence (skip if already buttoned)

A `<pre>` is skipped when any of these matches as a child:

- `.aed-code-copy` (this addon's own button — re-scan safe)
- `.fg-copy` (e.g. the `/internal-fork/` page's hand-rolled copy script)
- `.copy-btn`
- `[data-copy-button]`

So you can leave hand-rolled copy buttons in place during a migration
and the addon won't double-up.

Also skipped:
- `<pre>` containing fewer than 6 chars (likely decorative).

## Copy behavior

- Reads `pre.textContent` with the addon's own button + label nodes
  cloned-out first, so the copied text doesn't include "Copy" / "BASH".
- Strips trailing newlines.
- Uses `navigator.clipboard.writeText()` with a hidden-textarea +
  `execCommand('copy')` fallback for older browsers.
- Visual feedback: button border + icon turn green and label flips to
  "Copied" for 1.5s.

## Mobile

At ≤480px the language label and the "Copy" word are both hidden — the
button collapses to just the icon to save horizontal space inside small
code blocks.

## Public API

```js
window.__codeCopy.refresh()       // re-scan after dynamic insert
window.__codeCopy.attach(preEl)   // attach to one specific <pre>
```

## Versioning

`VERSION` constant lives at the top of `code-copy.js`.
