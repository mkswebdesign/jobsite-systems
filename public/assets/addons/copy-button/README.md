# Copy Button — portable generic copy-to-clipboard trigger

A drop-in folder. Marks any `<button>` or `<a>` with `data-aed-copy`
as a clipboard trigger. Copies either literal text (`data-aed-copy-text`)
or another element's textContent (`data-aed-copy-from="#sel"`).

Sibling to `/code-copy/` (targets `<pre><code>` blocks) and
`/copy-input/` (wraps form inputs). This one is for stand-alone copy
buttons next to addresses, phone numbers, share URLs, anything where
you want a discoverable click target.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `copy-button.css` | Button styling + ghost / icon variants + copied state. Theme-aware. |
| `copy-button.js` | Source resolution (literal vs from-selector), clipboard with execCommand fallback, event dispatch. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "copy-button": { "enabled": true } }
```

## Markup

```html
<!-- Copy literal text -->
<button data-aed-copy data-aed-copy-text="hello@gomks.com">Copy email</button>

<!-- Copy another element's textContent -->
<span id="addr">123 Main St, Austin TX 78701</span>
<button data-aed-copy data-aed-copy-from="#addr">Copy address</button>

<!-- Variants -->
<button data-aed-copy data-aed-copy-text="..." data-aed-copy-variant="ghost">Copy</button>
<button data-aed-copy data-aed-copy-text="..." data-aed-copy-variant="icon" aria-label="Copy"></button>

<!-- Custom labels -->
<button data-aed-copy
        data-aed-copy-text="GOMKS-LAUNCH-50"
        data-aed-copy-label="Copy code"
        data-aed-copy-copied-label="✓ Copied!">Copy code</button>

<!-- Anchor instead of button (works the same; clicks intercepted) -->
<a data-aed-copy data-aed-copy-text="https://gomks.com/?ref=anthony">Copy link</a>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-copy` | required | Opt-in marker |
| `data-aed-copy-text` | (none) | Literal text to copy. Wins over `-from`. |
| `data-aed-copy-from` | (none) | CSS selector — use that element's `textContent` |
| `data-aed-copy-label` | element's existing text | Idle button label |
| `data-aed-copy-copied-label` | `"Copied"` | Label after a successful copy |
| `data-aed-copy-variant` | (default) | `ghost` (transparent) / `icon` (32px round, hides label) |

## Events

```js
document.addEventListener('aed:copy:done', (e) => {
  // e.target = the button that was clicked
  // e.detail.text = the string that was copied
});
```

Bubbles up so you can listen on `document`.

## Public API

```js
window.__copyButton.refresh()      // re-scan after dynamic insert
window.__copyButton.copy(button)   // programmatic trigger
```

## Versioning

`VERSION` constant lives at the top of `copy-button.js`.
