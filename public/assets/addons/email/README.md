# Email — contact-form routing config

Runtime config layer for the site's contact forms. Reads one JSON
block from `<head>` (emitted by the brand's `site.json`) and applies
it to every `<form data-aed-form>` on the page.

Does not submit forms on its own — that's the [`forms`](../forms/)
addon's job. This addon only rewrites the form's `action`, `_subject`,
and `brand` fields at load time.

## What's in this folder

| File | Role |
|---|---|
| `email.js` | Reads `#aed-email-config`, rewrites form metadata. |
| `email.css` | Placeholder — no UI yet. |
| `addon.json` | Manifest + documented config schema. |
| `README.md` | This file. |

## Enabling for a brand

Add to `content/brands/<brand>/site.json → addons`:

```json
"email": {
  "enabled": true,
  "json": [
    {
      "id": "aed-email-config",
      "data": {
        "endpoint": "https://contact-proxy.anthony-abc.workers.dev",
        "subject": "New inquiry from <brand>.com",
        "debug": false
      }
    }
  ]
}
```

Then also enable the `forms` addon so the AJAX submit actually fires.

## Config fields

| Field | Type | Effect |
|---|---|---|
| `endpoint` | string | Overrides `form.action` on every form. Point to the contact-proxy Worker. |
| `subject` | string | Overrides hidden `_subject` input. If empty, the per-form `_subject` from `contact.json` stays. |
| `brandOverride` | string | Overrides hidden `brand` input (normally set at build time from `PUBLIC_BRAND`). Useful for testing fallback routing. |
| `debug` | boolean | Logs the full submitted payload to the console on submit. Leave off in production. |

## Relationship to the Worker

The Worker at `arich-astro/workers/contact-proxy/` holds the emailit
API key and the per-brand `from` / `to` / `origin` map. This addon
is the **client-side config surface** — it decides which endpoint and
which `brand` identifier the form submits under. The Worker decides
what email actually gets sent from that identifier.

If you change the Worker URL (new Cloudflare account, custom domain),
update `endpoint` here instead of touching every brand's `contact.json`.
