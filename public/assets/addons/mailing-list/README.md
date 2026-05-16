# Mailing List — portable newsletter signup

A drop-in folder. Hydrates `<div data-aed-mailing-list></div>` with an
inline email form wired to one of five providers: ConvertKit, Beehiiv,
Buttondown, MailerLite, or any custom POST endpoint.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `mailing-list.css` | Card + form layout, success / error status, mobile stack. Theme-aware. |
| `mailing-list.js` | Provider-aware submit (JSON for ConvertKit, FormData for the rest), success / error UI, events. |
| `README.md` | This file. |

## Integration

Enable in `site.json` with provider config:

```json
"addons": {
  "mailing-list": {
    "enabled": true,
    "json": [{
      "id": "aed-mailing-list",
      "data": {
        "provider": "buttondown",
        "endpoint": "https://buttondown.email/api/emails/embed-subscribe/anthony",
        "headline": "Notes from the workshop",
        "body":     "Once a month: how a productized site service actually runs day-to-day.",
        "placeholder": "you@company.com",
        "buttonLabel": "Subscribe",
        "footer":   "Unsubscribe anytime. We don't share your address.",
        "extraFields": { "tags": "gomks-launch" }
      }
    }]
  }
}
```

Drop the placeholder anywhere:

```html
<div data-aed-mailing-list></div>

<!-- Or read a differently-named source on the same page -->
<div data-aed-mailing-list data-aed-ml-source="aed-mailing-list-bottom"></div>

<!-- Bare variant: no card chrome (for embedding in your own block) -->
<div data-aed-mailing-list data-aed-ml-variant="bare"></div>
```

## Provider notes

| Provider | `endpoint` | Body |
|---|---|---|
| `convertkit` | Your form's POST URL — `https://api.convertkit.com/v3/forms/<form-id>/subscribe?api_key=...` *or* the form-action URL from your embed code | JSON `{ email_address, ...extraFields }` |
| `beehiiv` | Form action URL from your embed | FormData (`email`, plus extras) |
| `buttondown` | `https://buttondown.email/api/emails/embed-subscribe/<your-username>` | FormData (`email` + `email_input`) |
| `mailerlite` | Your embedded form action URL | FormData (`email` + extras) |
| `custom` | Anywhere that accepts a POST and returns 2xx | FormData (`email` + extras) |

Cross-origin POSTs return opaque responses (`response.type === 'opaque'`)
which the addon treats as success. This is intentional — most newsletter
providers don't expose CORS for embed forms.

## Schema

| Field | Default | Purpose |
|---|---|---|
| `provider` | `custom` | One of `convertkit` / `beehiiv` / `buttondown` / `mailerlite` / `custom` |
| `endpoint` | required | Where to POST |
| `headline` | `Subscribe` | Title text |
| `body` | `""` | Description paragraph |
| `placeholder` | `you@example.com` | Email input placeholder |
| `buttonLabel` | `Subscribe` | Submit button text |
| `footer` | `""` | Small print under the form |
| `successMessage` | `"Thanks — check your inbox to confirm."` | Status banner on 2xx |
| `errorMessage` | `"Something went wrong. Please try again."` | Status banner on failure |
| `extraFields` | `{}` | Additional form fields posted with the email (tags, source, etc.) |

## Events

```js
document.addEventListener('aed:mailing-list:success', (e) => {
  // e.detail.email
  __toast?.success?.('Subscribed!');
});
document.addEventListener('aed:mailing-list:error', (e) => {
  // e.detail.email
});
```

Bubbles up so you can listen on `document`.

## Behavior

- **Inline validation**: requires a basic email shape (`x@y.z`).
- **Provider-aware encoding**: ConvertKit gets JSON; others get
  FormData with provider-specific field naming.
- **Opaque-success**: cross-origin POSTs return type `opaque`; treated
  as success since most providers don't surface CORS-allowed errors.
- **Form replaces with success message** on success — input row is
  hidden so the user doesn't accidentally double-submit.

## Public API

```js
window.__mailingList.refresh()   // re-scan after dynamic insert
```

## Versioning

`VERSION` constant lives at the top of `mailing-list.js`.
