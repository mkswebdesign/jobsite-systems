# Print mode — portable print stylesheet

A drop-in folder. Copy `public/addons/print-mode/` to another site's `public/` and
add two tags to your layout. That's the entire install.

## What's in this folder

| File | Role |
|---|---|
| `print.css` | All `@media print` rules — palette, page margins, typography, hides chrome, normalizes cards/buttons/links for paper. |
| `print.js` | Optional helpers: `?print=preview` toggle, `[data-print-button]` placeholder injector, date-stamp filler. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/print-mode/` into your new site's `public/` directory. Your
build tool should serve these files at `/addons/print-mode/print.css` and
`/addons/print-mode/print.js`.

### Step 2 — link `print.css` in `<head>`

```html
<link rel="stylesheet" href="/addons/print-mode/print.css" media="print" />
```

The `media="print"` attribute means browsers only fetch and apply this CSS
when actually printing — zero cost on screen.

### Step 3 — load `print.js` before `</body>` (optional)

```html
<script defer src="/addons/print-mode/print.js"></script>
```

Without `print.js` the print stylesheet still works perfectly when the user
hits Ctrl+P. The script only adds:

- `?print=preview` to render the page as it would print, without the dialog
- `[data-print-button]` placeholder support
- Auto-fill for the print stamp date

### Step 4 — (optional) add a print stamp

Include this once in your base layout. It's hidden on screen and appears at
the top of the first printed page:

```html
<div class="print-stamp" aria-hidden="true">
  <span class="print-stamp-brand">Your Brand</span>
  <span class="print-stamp-url">https://yourbrand.com/page</span>
  <span class="print-stamp-date"></span>
</div>
```

Leave `.print-stamp-date` empty — `print.js` fills it client-side so the
date stays accurate even on cached HTML.

### Step 5 — (optional) add a "Print page" button anywhere

```html
<span data-print-button></span>
```

`print.js` finds the placeholder and replaces it with a styled button that
calls `window.print()` on click. To customize the label:

```html
<span data-print-button data-print-button-label="Save as PDF"></span>
```

You're responsible for the button's visual styling (color, padding,
border) — the script ships only the icon + label markup. Add a `.print-button`
rule in your global CSS to taste.

## Activation paths

| Path | Behavior |
|---|---|
| User hits Ctrl/Cmd + P | Browser native print dialog uses `print.css`. |
| `[data-print-button]` clicked | Calls `window.print()`. |
| `?print=preview` in URL | Renders the page as it would print, persists via sessionStorage. |
| `?print=normal` in URL | Reverts to print-only behavior. |
| Console: `__printMode.setPreview(true)` | Same as `?print=preview`. |

## What `print.css` does

- Resets palette to ink-friendly values (white background, near-black text)
- Sets `@page` margins (0.6in top/bottom, 0.5in sides)
- Hides nav, footer, contact widget, theme toggle, editor panel, page transitions, skip link, billing toggle UI, decorative badges
- Strips background images from hero / section blocks
- Forces all `[data-billing-only]` panels visible (so a printed pricing page shows both monthly + annual)
- Annotates external link URLs inline: `Bluebird Electric (https://bluebirdelectric.com)`
- Disarms reveal animations so content prints regardless of scroll state
- Outlines buttons instead of filling them (saves toner)
- Prevents page breaks inside cards and after headings
- Preserves `--accent` so brand identity survives in print

## sessionStorage key

| Key | Storage | Purpose |
|---|---|---|
| `aed:print-preview` | sessionStorage | User has activated preview mode this tab |

Namespaced with `aed:` to match the rest of the drop-in family
(`/theme/`, `/editor/`).

## Versioning

The runtime `VERSION` constant lives at the top of `print.js`. Bump it when
you ship a change.
