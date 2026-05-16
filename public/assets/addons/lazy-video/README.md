# Lazy Video — portable lazy `<video>` + privacy-friendly YouTube / Vimeo

A drop-in folder. Two surfaces in one addon:

1. **Native lazy `<video>`**: doesn't load source files until scrolled
   into view (300px root margin).
2. **YouTube / Vimeo facade**: renders a poster image + play button until
   clicked. YouTube uses `youtube-nocookie.com` so no cookies are set
   until the user actually plays.

## What's in this folder

| File | Role |
|---|---|
| `lazy-video.css` | Facade card with aspect-ratio 16:9, poster, play button, provider tag, title. Theme-aware. |
| `lazy-video.js` | Native `<video>` IntersectionObserver loader, facade builder for YouTube / Vimeo / custom embed URLs. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/lazy-video/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/lazy-video/lazy-video.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/lazy-video/lazy-video.js"></script>
```

## Usage

### Native lazy `<video>`

Move the `src` to `data-src`. The addon flips it back when the element
scrolls within 300px of the viewport.

```html
<video data-aed-lazy poster="/posters/demo.jpg" controls muted playsinline>
  <source data-src="/videos/demo.mp4" type="video/mp4">
  <source data-src="/videos/demo.webm" type="video/webm">
</video>
```

The poster image still loads immediately so the box isn't empty.

### YouTube facade (no third-party cookies until click)

```html
<div data-aed-video="youtube:dQw4w9WgXcQ"
     data-aed-video-title="A productized site for Acme">
</div>
```

Poster auto-loads from `i.ytimg.com/vi/<id>/maxresdefault.jpg` with a
fallback to `hqdefault.jpg` if maxres doesn't exist. Click → real
iframe loaded from `youtube-nocookie.com` with autoplay.

Optional start time:

```html
<div data-aed-video="youtube:dQw4w9WgXcQ" data-aed-video-start="42"></div>
```

### Vimeo facade

Vimeo doesn't expose a public poster URL like YouTube does — provide
one yourself:

```html
<div data-aed-video="vimeo:123456789"
     data-aed-video-poster="/posters/vimeo-123.jpg"
     data-aed-video-title="Customer interview">
</div>
```

Click → real Vimeo iframe with `?autoplay=1&dnt=1` (Do Not Track).

### Custom provider

```html
<div data-aed-video="custom:https://embed.example.com/abc"
     data-aed-video-poster="/posters/custom.jpg">
</div>
```

## Per-element attributes

| Attribute | Purpose |
|---|---|
| `data-aed-video="<provider>:<id>"` | Required — picks provider + ID |
| `data-aed-video-poster="..."` | Override poster (required for Vimeo / custom) |
| `data-aed-video-title="..."` | Caption shown over poster + iframe `title` for a11y |
| `data-aed-video-start="42"` | YouTube only — start time in seconds |

## Behavior

- **Privacy**: YouTube facade never contacts `youtube.com` until the
  user clicks. The iframe uses `youtube-nocookie.com`. Vimeo iframe
  carries `dnt=1` (Do Not Track).
- **Performance**: a YouTube iframe weighs ~400KB on load and triggers
  ~10 third-party requests. The facade is one image + the addon JS.
- **Accessibility**: facade is a `role="button"`, focusable, Enter / Space
  triggers play. Iframe gets a meaningful `title`.
- **Reduced motion**: hover scale on the play button is disabled.
- **Print mode**: play button hidden.

## Public API

```js
window.__lazyVideo.refresh()       // re-scan after dynamic insert
window.__lazyVideo.play(el)        // programmatically activate a facade
```

## Versioning

`VERSION` constant lives at the top of `lazy-video.js`.
