# Anchor Headings — portable click-to-link headings

A drop-in folder. Adds an auto-`id` to every heading inside a configured
scope (`main, article` by default), then appends a discreet `#` link
revealed on hover. Click it to copy the URL-with-anchor to the
clipboard. Standard docs pattern.

## What's in this folder

| File | Role |
|---|---|
| `anchor-headings.css` | The hover-revealed link icon, `scroll-margin-top` to clear sticky nav + announcement bar, copied-state animation. |
| `anchor-headings.js` | Opt-in gate, scope + level config, slug generator with collision dedup, click-to-copy, hash-on-load re-scroll. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/anchor-headings/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/anchor-headings/anchor-headings.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/anchor-headings/anchor-headings.js"></script>
```

### Step 4 — opt in with a `<meta>` tag

```html
<meta name="aed:anchor-headings" content="on" />
```

Defaults: scope = `main, article`, heading levels = `2, 3, 4`. Override:

```html
<meta name="aed:anchor-headings" content="on"
      data-scope="article.fg-content, .doc-content"
      data-levels="2,3" />
```

### Per-page disable

```html
<html data-aed-anchor-headings="off"> ... </html>
```

## Behavior

- **Auto-IDs**: Headings without an `id` get one — slug derived from
  text (lowercased, accents stripped, non-alphanumeric → `-`, collapsed,
  trimmed). Collisions get `-2`, `-3`, etc.
- **Existing IDs preserved**: never overwritten.
- **Scroll offset**: each processed heading gets
  `scroll-margin-top: calc(var(--aed-announcement-h, 0) + var(--aed-nav-h, 80px) + 12px)`
  so anchor jumps clear the sticky nav and any open announcement bar.
- **`--aed-nav-h` is yours to set**: define it in your global CSS to match
  your nav height. Default fallback is 80px:

  ```css
  :root { --aed-nav-h: 64px; }
  ```

- **URL update**: clicking `#` updates the address bar via
  `history.replaceState` (no extra entry in the back stack).
- **Hover-to-reveal**: on touch devices (`@media (hover: none)`), the
  `#` link is always faintly visible since hover doesn't exist.
- **Copy feedback**: the `#` icon turns green for 1.5s.
- **Print mode**: the `#` icons are hidden.
- **Reduced motion**: no slide-in animation on the `#` icon.

## Public API

```js
window.__anchorHeadings.refresh()       // re-scan after dynamic content insert
window.__anchorHeadings.slug("My H2")   // -> "my-h2"
```

## Customizing the look

Override styles freely:

```css
.aed-anchor-link {
  margin-left: 0.6em;
  color: var(--accent, #6B00FF);
  opacity: 0.4;
}
[data-aed-anchor]:hover .aed-anchor-link { opacity: 1; }
```

## Versioning

`VERSION` constant lives at the top of `anchor-headings.js`.
