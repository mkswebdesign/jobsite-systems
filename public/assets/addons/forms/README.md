# Forms — portable form submission handler

A drop-in folder. Adds AJAX submit, inline success/error UI, and an
auto-injected honeypot to any `<form data-aed-form>` element. Works
with Formspree, Basin, Web3Forms, Netlify Forms, your own endpoint —
anything that accepts a `POST` and returns a 2xx.

## What's in this folder

| File | Role |
|---|---|
| `forms.css` | Submitting state, error banner, success card, honeypot positioning. Theme-aware. |
| `forms.js` | Hooks `<form data-aed-form>`, intercepts submit, fetches the endpoint, swaps success/error UI, fires events. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/forms/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/forms/forms.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/forms/forms.js"></script>
```

### Step 4 — opt a form in

Add `data-aed-form` to any form you want handled. The `action` attribute
is used as the endpoint, so existing Formspree-style markup works as-is:

```html
<form data-aed-form action="https://formspree.io/f/yourId" method="POST">
  <label>Name <input name="name" required></label>
  <label>Email <input name="email" type="email" required></label>
  <label>Message <textarea name="message" required></textarea></label>
  <button type="submit">Send</button>
</form>
```

### Step 5 — (optional) page-level default endpoint

If you want one endpoint reused across multiple forms on a page (or
across the site via your layout), set it once:

```html
<meta name="aed:form-endpoint" content="https://formspree.io/f/yourId" />
```

Forms with no `action` and no `data-aed-form-endpoint` fall back to this.

## Per-form configuration (data-attributes)

| Attribute | Purpose |
|---|---|
| `data-aed-form` | Required — opts the form in |
| `data-aed-form-endpoint="..."` | Overrides `action` and the page-level meta |
| `data-aed-form-success-title="..."` | Success card title (default: "Thanks — we got it.") |
| `data-aed-form-success-body="..."` | Success card body |
| `data-aed-form-redirect="/path/"` | Full-page redirect on success instead of inline card |

## Behavior

- **Submit interception**: form's native submit is prevented; data sent via
  `fetch(endpoint, { method, body: FormData, headers: { Accept: 'application/json' } })`.
- **Submitting state**: form gets `data-aed-state="submitting"`, the submit
  button is disabled and shows a spinner. Existing button label preserved.
- **Honeypot**: a hidden `_gotcha` input is auto-injected. If a bot fills
  it, the addon shows the success UI without hitting the endpoint and
  without recording the spam.
- **Success**: form element is *replaced* with a centered success card.
  Focus is moved for screen readers.
- **Redirect mode**: if `data-aed-form-redirect` is set, navigates instead
  of showing the inline card.
- **Error**: an error banner is inserted at the top of the form with a
  human-readable message; user data is preserved so they can retry.
- **Events**: `aed:form:success` and `aed:form:error` bubble up from the
  form. Use them for analytics:

```js
document.addEventListener('aed:form:success', (e) => {
  // e.target is the form, e.detail.payload is the parsed response
  plausible('Form Submit', { props: { form: e.target.id || 'unknown' } });
});
```

## Multi-step / custom forms

The addon is *only* the network and UI-swap layer. Your own JS owns:

- field validation
- step navigation
- the review screen, etc.

When the user finally clicks the submit button on the last step, the
addon takes over from there. Don't `e.preventDefault()` in your own
submit listener — let the addon handle it, or call
`window.__forms.submit(formEl)` manually if you have your own flow.

## Public API

```js
window.__forms.attach(form)   // wire a form added to the DOM later
window.__forms.submit(form)   // trigger submission programmatically
```

## Versioning

`VERSION` constant lives at the top of `forms.js`. Bump it when you ship
a change.
