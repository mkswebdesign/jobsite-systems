# Toast — portable notification system

A drop-in folder. Pure programmatic API for showing transient
notifications (success, error, warning, info). Other addons can use it
to share one notification UI instead of half-building their own.

## What's in this folder

| File | Role |
|---|---|
| `toast.css` | Six positioned regions (top/bottom × left/center/right), kind-colored left-border, optional action button, dismiss X. Theme-aware. |
| `toast.js` | Programmatic API, lazy region mount, optional auto-bridges to other addons. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/addons/toast/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/addons/toast/toast.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/addons/toast/toast.js"></script>
```

### Step 4 — (optional) configure default position + auto-bridges

```html
<meta name="aed:toast" content="bottom-right" data-bridge="form,copy" />
```

| Position | Purpose |
|---|---|
| `top-right` (default) | Standard SaaS pattern |
| `top-center` | High-attention announcements |
| `bottom-right` | Less intrusive |
| `bottom-center` | "Status" feeling |
| `top-left` / `bottom-left` | Avoids contact-fab on the right |

| Bridge | Behavior when on |
|---|---|
| `form` | Listens for `aed:form:success` and `aed:form:error` events from `/addons/forms/` and auto-toasts |
| `copy` | Listens for the native `copy` event and toasts "Copied to clipboard" |

Bridges are off by default — opt in via `data-bridge`.

## Public API

```js
__toast.show({
  kind:    'info' | 'success' | 'warn' | 'error',
  title:   'Optional title',
  text:    'Body copy',
  duration: 4000,                        // ms; 0 = sticky (no auto-dismiss)
  position: 'top-right',                 // overrides default for this toast
  action: {
    label: 'Undo',
    onClick: () => { ... },
    href: '/somewhere',                  // optional — if set, becomes <a>
    target: '_blank',                    // optional
    dismiss: true                        // dismiss after click (default true)
  }
})
// → returns toast id

__toast.dismiss(id)
__toast.clear()                          // dismiss all

// Shortcuts (all return the toast id):
__toast.info('Tip: ...')
__toast.success('Saved!')
__toast.warn('Heads up.')
__toast.error('Network error.', { duration: 0 })   // sticky
```

## Examples

```js
// Form submitted
__toast.success('Thanks — we got your message.', {
  action: { label: 'Schedule', href: '/contact/' }
});

// Copy confirmation
__toast.show({ kind: 'info', text: 'Link copied', duration: 1800 });

// Sticky error with retry
const id = __toast.error('Couldn\'t save your changes.', {
  duration: 0,
  action: { label: 'Retry', onClick: () => doSave().then(() => __toast.dismiss(id)) }
});

// Theme switch confirmation
document.getElementById('themeToggle').addEventListener('click', () => {
  __toast.show({ kind: 'info', text: 'Switched to ' + (document.documentElement.dataset.theme || 'auto') + ' mode' });
});
```

## Cross-addon integration

Other addons can dispatch standardized events that `/addons/toast/` (with
`data-bridge`) will pick up automatically:

```js
// In your addon — fire a friendly toast without depending on /addons/toast/
if (window.__toast) {
  window.__toast.success('Pattern saved');
}
// or via custom event — picks up any listening addon
document.dispatchEvent(new CustomEvent('aed:notify', {
  detail: { kind: 'success', text: 'Pattern saved' }
}));
```

If `__toast` is undefined (toast addon not installed), your code still
runs — just no toast.

## Behavior

- **Lazy region mount**: regions only created when first used at that
  position. Multiple positions can coexist on the same page.
- **A11y**: regions get `role="region"`, `aria-live="polite"`. Errors
  use `role="alert"`; others use `role="status"`.
- **Auto-dismiss**: default 4s. Pass `duration: 0` for sticky.
- **Stacking**: top-anchored regions stack downward; bottom-anchored
  regions stack upward (newest closest to the corner).
- **Print mode**: hidden in `@media print`.
- **Reduced motion**: no scale/translate transitions, just fade.

## Versioning

`VERSION` constant lives at the top of `toast.js`.
