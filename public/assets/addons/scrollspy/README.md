# Scrollspy — portable active-link tracker

A drop-in folder. For every `[data-aed-scrollspy]` container on the
page, walks its `<a href="#id">` children, observes the matching
sections via IntersectionObserver, and toggles `is-active` on the link
whose target is currently in the viewport. Style the active state in
your own CSS.

Pairs with `/toc/` (which has scrollspy built in for itself) — use this
addon for your *own* nav containers (sticky sidenav, top tab bar,
floating mini-menu).

## What's in this folder

| File | Role |
|---|---|
| `scrollspy.css` | Just a sensible default for `.is-active` (brand accent color). Override at will. |
| `scrollspy.js` | Container discovery, anchor matching, IntersectionObserver attach. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/addons/scrollspy/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/addons/scrollspy/scrollspy.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/addons/scrollspy/scrollspy.js"></script>
```

### Step 4 — mark a container

```html
<nav data-aed-scrollspy>
  <a href="#intro">Intro</a>
  <a href="#features">Features</a>
  <a href="#pricing">Pricing</a>
  <a href="#faq">FAQ</a>
</nav>
```

For each `<a href="#id">`, the addon finds `document.getElementById('id')`
and observes it. When that target scrolls into view, the link gets
`is-active`.

## Per-container attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-scrollspy` | (required) | Marks the container |
| `data-aed-scrollspy-class` | `"is-active"` | Class toggled on the matching link |
| `data-aed-scrollspy-rootmargin` | `"-15% 0px -65% 0px"` | IntersectionObserver `rootMargin`. Controls *when* a section is considered "in view." Default activates as the section crosses the upper-third of the viewport. |

## Styling

Default CSS gives you brand-color text on the active link. Style further
in your own CSS:

```css
[data-aed-scrollspy] a {
  color: var(--text-secondary);
  border-left: 2px solid transparent;
  padding-left: 0.6rem;
  transition: color 0.15s ease, border-color 0.15s ease;
}
[data-aed-scrollspy] a.is-active {
  color: var(--accent);
  border-left-color: var(--accent);
}
```

## Difference vs `/toc/`

| | `/toc/` | `/addons/scrollspy/` |
|---|---|---|
| Generates link list? | Yes (from headings) | No (you author the links) |
| Has scrollspy built in | Yes (only for itself) | Yes (for any nav container) |
| Use for | Auto-TOC on long-form pages | Hand-authored nav (sidebar, top tabs) |

You can use both on the same page — they don't conflict.

## Public API

```js
window.__scrollspy.refresh()              // re-scan all containers
window.__scrollspy.set(container, 'id')   // force-highlight a link by id
```

## Versioning

`VERSION` constant lives at the top of `scrollspy.js`.
