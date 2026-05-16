# Demo Modal

Click-intercept modal for `/demo/<slug>/*` pages. When a visitor on a demo page clicks a link or button that points to another page **within the same demo**, this modal opens first — reminds them they're viewing a sample site and points them at real pricing / contact CTAs. After dismiss, the original navigation proceeds.

## Behavior

- Activates only when `location.pathname` starts with `/demo/<slug>/`. On all non-demo pages, the addon does nothing.
- Computes the active demo slug from the path (`/demo/stillwater-therapy/contact/` → `stillwater-therapy`) and intercepts clicks only on `<a>` elements whose `href` resolves to another page within the same demo. Out-of-demo links (`/pricing/`, `/contact/`, external) navigate normally.
- After the modal opens, the visitor can:
  - Click the primary CTA (typically `/pricing/`) — modal closes, user navigates to the brand's real pricing page.
  - Click the optional secondary CTA (typically `/contact/`).
  - Click "Continue to the demo page" — modal closes, the original demo-page navigation proceeds.
  - Press `Esc` or click the backdrop — modal closes, no navigation.
- `interceptOncePerSession: true` (default) shows the modal at most once per demo per browser session — subsequent in-demo clicks navigate directly. Set `false` to show every time.

## Configure

Enable in the brand's `site.json`:

```json
"addons": {
  "demo-modal": {
    "enabled": true,
    "json": [
      {
        "id": "aed-demo-modal-config",
        "data": {
          "eyebrow": "Heads up — this is a demo",
          "heading": "You're viewing a sample practice site",
          "body": "This is a fully-built example of what your Helping Systems site could look like. The pricing, schedules, and clinician details here are illustrative.",
          "pricingCta": { "label": "See real pricing", "href": "/pricing/" },
          "contactCta": { "label": "Start your site", "href": "/contact/" },
          "continueLabel": "Continue browsing the demo",
          "interceptOncePerSession": true
        }
      }
    ]
  }
}
```

## Public API

```js
window.__demoModal.show(href);   // open modal, optionally remembering an href to navigate to on continue
window.__demoModal.hide();       // close modal
window.__demoModal.reset();      // clear the per-session shown flag
window.__demoModal.config;       // resolved config
```

## Why per-link interception (not a global beforeunload)

`beforeunload` is browser-controlled — its UI can't be styled and the browser disables it on programmatic navigation. Intercepting click events at the link level lets us render a styled modal inline, control the proceed/cancel flow, and surface real-brand CTAs that don't navigate away from the demo context until the visitor chooses.

## Why per-session (default)

A visitor who's actively exploring the demo site shouldn't get pestered on every click. Showing the modal once establishes the disclosure ("this is illustrative") and provides the pricing CTA — subsequent clicks let them browse the demo flow naturally. If a brand wants the disclosure on every click, set `interceptOncePerSession: false`.
