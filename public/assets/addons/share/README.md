# Share — portable social share buttons

A drop-in folder. Hydrates `[data-aed-share]` elements with a row of
icon buttons that open the network's intent URL in a new tab (Twitter /
LinkedIn / Bluesky / Facebook / Reddit / HN / WhatsApp), open the OS
mail client (Email), or copy the link to the clipboard.

**No third-party scripts loaded.** No AddThis, no ShareThis, no
tracking pixels. Just intent URLs.

## What's in this folder

| File | Role |
|---|---|
| `share.css` | Round icon buttons, hover tooltips, per-network color tints, ghost + pill variants. Theme-aware. |
| `share.js` | Network registry, button builder, clipboard fallback, public API. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/share/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/share/share.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/share/share.js"></script>
```

### Step 4 — drop buttons where they belong

```html
<!-- Default network set (twitter, linkedin, email, copy) -->
<div data-aed-share></div>

<!-- Pick networks explicitly -->
<div data-aed-share="twitter,bluesky,linkedin,copy"></div>

<!-- Override URL/title (default: current page) -->
<div data-aed-share
     data-aed-share-url="https://gomks.com/work/example/"
     data-aed-share-title="A productized site for Example"
     data-aed-share-text="See how this came together">
</div>

<!-- With a small label -->
<div data-aed-share data-aed-share-label="Share"></div>

<!-- Pill variant: text + icon -->
<div data-aed-share="twitter,copy" data-aed-variant="pill"></div>

<!-- Ghost variant: no border / background until hover -->
<div data-aed-share data-aed-variant="ghost"></div>
```

### Step 5 — (optional) override default network list site-wide

```html
<meta name="aed:share-default" content="twitter,bluesky,linkedin,email,copy" />
```

## Available networks

| Token | Network | Action |
|---|---|---|
| `twitter` | X (Twitter) | `twitter.com/intent/tweet` |
| `bluesky` | Bluesky | `bsky.app/intent/compose` |
| `linkedin` | LinkedIn | `linkedin.com/sharing/share-offsite` |
| `facebook` | Facebook | `facebook.com/sharer` |
| `reddit` | Reddit | `reddit.com/submit` |
| `hackernews` | Hacker News | `news.ycombinator.com/submitlink` |
| `whatsapp` | WhatsApp | `wa.me/?text=` |
| `email` | Email | `mailto:?subject=…&body=…` |
| `copy` | Copy link | `navigator.clipboard.writeText()` (with execCommand fallback) |

## Per-element data attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-share` | (page default) | Comma-separated network tokens |
| `data-aed-share-url` | `window.location.href` | URL to share |
| `data-aed-share-title` | `document.title` | Title (used by Email subject, Reddit title, HN title) |
| `data-aed-share-text` | `""` | Optional copy prepended to URL on Twitter / Bluesky / WhatsApp / Email body |
| `data-aed-share-label` | (none) | Small uppercase label rendered before the buttons |
| `data-aed-variant` | (none) | `ghost` (no border until hover) or `pill` (text + icon side by side) |

## Behavior

- **No popups blocked**: every button is a real `<a target="_blank">` —
  works without JS for the network buttons. Only Copy needs JS.
- **Copy feedback**: button border turns green and tooltip flashes
  "Copied!" for 1.5s.
- **Hover tooltips**: pure CSS, no JS overhead. Tooltips hidden in pill
  variant (text already visible).
- **Print mode**: hidden in `@media print`.
- **Reduced motion**: hover translation disabled.

## Public API

```js
window.__share.networks                     // Object.keys of available networks
window.__share.attach(el)                   // wire an element added later
window.__share.url('twitter', { url, title, text })  // get intent URL without rendering
```

## Versioning

`VERSION` constant lives at the top of `share.js`.
