# TOC — portable auto-generated table of contents

A drop-in folder. Hydrates `<aside data-aed-toc></aside>` placeholders
with a navigable list built from the headings inside a configurable
scope. IntersectionObserver-driven scrollspy highlights the current
section as you scroll.

Pairs naturally with `/anchor-headings/` — both auto-ID headings the
same way, neither overwrites existing IDs.

## What's in this folder

| File | Role |
|---|---|
| `toc.css` | List styles, sticky / floating positioning, mobile collapse pattern. Theme-aware. |
| `toc.js` | Heading discovery, slug + ID generation, scrollspy via IntersectionObserver, click-to-scroll, mobile collapse. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/toc/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/toc/toc.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/toc/toc.js"></script>
```

### Step 4 — drop placeholders where you want a TOC

```html
<!-- Inline at top of article -->
<aside data-aed-toc></aside>

<!-- Sticky to viewport -->
<aside data-aed-toc data-aed-toc-position="sticky"></aside>

<!-- Floating in the right margin (desktop ≥1280px only; falls back inline) -->
<aside data-aed-toc data-aed-toc-position="floating"></aside>

<!-- Custom scope + levels -->
<aside data-aed-toc
       data-aed-toc-scope="article.fg-content"
       data-aed-toc-levels="2,3"
       data-aed-toc-title="In this guide"
       data-aed-toc-min="3"></aside>
```

Without a placeholder, the addon does nothing — you opt in per page
by where you drop the `<aside>`.

### Per-page disable

```html
<html data-aed-toc="off"> ... </html>
```

## Per-element data attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-toc` | (required) | Marks the placeholder |
| `data-aed-toc-scope` | `"article, main"` | Where to look for headings |
| `data-aed-toc-levels` | `"2,3"` | Heading levels to include |
| `data-aed-toc-min` | `"2"` | Hide if fewer than this many headings found |
| `data-aed-toc-title` | `"On this page"` | Header label |
| `data-aed-toc-position` | `"top"` | `top` (inline) / `sticky` / `floating` |

## Behavior

- **Auto-IDs**: headings without an `id` get one (lower-snake-case slug
  from text, deduplicated). Existing IDs preserved.
- **Skips itself**: headings inside `.aed-toc` (rare edge case) are
  excluded from the list.
- **Click-to-scroll**: smooth scroll, `history.replaceState` updates the
  URL hash without an extra back-stack entry.
- **Scrollspy**: IntersectionObserver tracks which heading is in view;
  the matching list item gets `is-active` styling.
- **Scroll offset**: relies on `--aed-announcement-h` and `--aed-nav-h`
  CSS variables for positioning. Define `--aed-nav-h` in your global
  CSS to match your nav (default fallback 80px).
- **Mobile collapse**: at ≤720px the TOC starts collapsed with a
  toggle. Tapping an item auto-collapses it again.
- **Print mode**: hidden in `@media print`.

## Coordination with `/anchor-headings/`

When both addons are installed:

- They share the same slugging convention, so the same `id` is produced
  whether one or both run.
- Each one independently checks for existing IDs and won't overwrite.
- The TOC's smooth-scroll uses the heading's `scroll-margin-top` (set
  by `/anchor-headings/`), so the jump clears your nav.

If `/anchor-headings/` isn't installed and you want clean offsets, set:

```css
:root { --aed-nav-h: 80px; }   /* match your nav height */
[id] { scroll-margin-top: calc(var(--aed-nav-h, 80px) + 16px); }
```

## Public API

```js
window.__toc.refresh()            // re-scan all placeholders
window.__toc.highlight('section') // force-highlight a specific id
```

## Versioning

`VERSION` constant lives at the top of `toc.js`.
