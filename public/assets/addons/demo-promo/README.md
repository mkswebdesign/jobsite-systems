# Demo Promo

Small bottom-right toast that appears after a scroll threshold and points visitors to a sample demo page.

## Behavior

- Appears once the visitor has scrolled past `scrollThreshold` (default 30%) of the page AND `minDelayMs` (default 1500ms) has elapsed since load — both gates have to pass before the toast shows.
- Dismissable via the X, "No thanks" button, or by clicking the CTA. Dismissal persists in `localStorage` keyed by `id`, so the visitor doesn't see the same toast twice.
- Auto-suppresses on `hideOnPaths` (default `['/demo/*', '/contact/', '/start/']`) — visitors who are already on the demo or already converting don't get pestered.

## Configure

Enable in the brand's `site.json`:

```json
"addons": {
  "demo-promo": {
    "enabled": true,
    "json": [
      {
        "id": "aed-demo-promo",
        "data": {
          "id": "flinthills-demo-2026q2",
          "eyebrow": "See it live",
          "heading": "See a real landscape site, end-to-end.",
          "body": "Walk through a fully-built sample landscape company site — same components, real copy, no signup.",
          "cta": { "label": "View demo", "href": "/demo/flinthills/" }
        }
      }
    ]
  }
}
```

The `id` field gates the dismiss flag. Bump it when you ship a new copy if you want everyone to see the new message.

## Public API

```js
window.__demoPromo.show();
window.__demoPromo.hide();
window.__demoPromo.reset();   // clear the dismiss flag for this id
window.__demoPromo.config;    // resolved config
```
