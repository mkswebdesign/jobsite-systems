# Internal Broken Links — portable staff link auditor

A drop-in folder. Hydrates `<div data-aed-broken-links></div>` with a
"Run audit" button. Click it → addon enumerates every same-origin
`href` and `src` on the page, walks one level deep into discovered
HTML pages (capped at 25), HEAD-fetches every URL it sees, and reports
non-2xx results in a sortable table.

Designed for staff-only pages. The addon does no IP gating — host the
placeholder behind whatever gate you already use (e.g. inside
`/internal-fork/` or its own noindex route).

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `internal-broken-links.css` | Card / button / table styling, status pills, progress bar. Theme-aware. |
| `internal-broken-links.js` | Crawler, concurrency-limited HEAD fetcher, results render. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "internal-broken-links": { "enabled": true } }
```

Drop a placeholder on whichever staff page should host it:

```html
<div data-aed-broken-links></div>
```

That's the entire integration.

## What it does

1. **Discover**: pulls every `<a href>` and `<img src>` from the
   current page, normalizes URLs, drops `mailto:` / `tel:` /
   `javascript:` / hash-only.
2. **Crawl one level deep**: for the first 25 same-origin HTML-ish
   URLs found, fetches the HTML and extracts more links from each.
3. **Check status**: HEAD-fetches every unique URL with a concurrency
   of 6. Falls back to GET for servers that reject HEAD with 405
   (xCloud, some CDNs).
4. **Report**: non-2xx + network errors in a table. 4xx → red, 5xx →
   amber, network failures (`status === 0`) → amber.

## Caveats

- **Server load**: an audit issues hundreds of small requests
  back-to-back. Run sparingly, never on a production marketing page
  visited by users.
- **External links**: skipped. This is an *internal* audit — broken
  outbound links to third-party sites need a separate tool (or extend
  the addon by removing the `isSameOrigin` filter, accepting the
  CORS limitations).
- **CORS**: same-origin requests succeed regardless of CORS headers,
  so this works for any URL on your own domain.
- **HttpOnly assets**: handled via GET fallback when HEAD fails.

## Console output

```js
window.__brokenLinks.run()        // trigger an audit programmatically
window.__brokenLinks.results      // most-recent results array (after a run)
                                  // each entry: { url, status, kind: 'HEAD' | 'GET' | 'NET' }
```

## Versioning

`VERSION` constant lives at the top of `internal-broken-links.js`.
