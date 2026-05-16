# Availability Banner — portable capacity indicator

A drop-in folder. Renders a status-dot pill or card on every
`<div data-aed-availability>` element in the page, hydrated from a
single source of truth. Trust signal — honest "currently booked through
X" or "3 spots remaining" beats fabricated urgency.

## What's in this folder

| File | Role |
|---|---|
| `availability-banner.css` | Card + pill variants. Status colors (`open` = accent, `limited` = amber, `booked` = neutral). Pulse animation on dot. Theme-aware. |
| `availability-banner.js` | State loader (inline JSON or fetched URL), per-element render with `data-aed-variant` choice, public API. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/availability-banner/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/availability-banner/availability-banner.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/availability-banner/availability-banner.js"></script>
```

### Step 4 — provide state

Inline JSON (single source of truth, all `[data-aed-availability]`
elements read from it):

```html
<script type="application/json" id="aed-availability">
{
  "status": "limited",
  "text": "**3 spots remaining** for May launches",
  "footnote": "Updated April 19, 2026",
  "cta": { "label": "Book intro", "href": "/contact/" }
}
</script>
```

Or fetched URL (server-side updates without rebuild):

```html
<meta name="aed:availability" content="/data/availability.json" />
```

If both are present, the inline JSON wins. With no data, every
`[data-aed-availability]` element is silently hidden — never an empty
box.

### State shape

| Field | Type | Purpose |
|---|---|---|
| `status` | `"open"` / `"limited"` / `"booked"` | Drives color + pulse. Defaults to `"open"`. |
| `text` | string (required) | Headline — supports `**bold**` |
| `footnote` | string | Small grey line below — typically a "Updated MM/DD" stamp |
| `cta` | `{ label, href, target? }` | Optional pill-shaped CTA on the right |

### Step 5 — drop the elements where they belong

```html
<!-- Default: full card -->
<div data-aed-availability></div>

<!-- Compact pill (great for nav, hero, footer) -->
<div data-aed-availability data-aed-variant="pill"></div>
```

Multiple instances on the same page all hydrate from the same state, so
you only update one place when capacity changes.

## Behavior

- **Status colors**: `open` = accent with pulsing dot, `limited` = amber
  with slower pulse, `booked` = neutral grey, no pulse.
- **No empty boxes**: when state is missing or has no `text`, every
  element is hidden. The addon never renders a placeholder.
- **A11y**: `role="status"` and an `aria-label` derived from the text
  (with `**` markers stripped).

## Public API

```js
window.__availability.get()               // current state (copy)
window.__availability.set(nextState)      // override + re-render
window.__availability.refresh()           // re-load from inline / URL and re-render
window.__availability.render(el, state)   // manually render one element
```

For dynamic updates (e.g., once a slot is booked):

```js
__availability.set({
  status: 'booked',
  text: 'Booked through **June** — next opening July 7',
  footnote: 'Updated April 22, 2026',
  cta: { label: 'Join waitlist', href: '/contact/' }
});
```

## Honest-defaults posture

Like `/social-proof/`, this addon doesn't help you fabricate urgency:

- **No countdown timer** to pressure visitors.
- **No artificial "spots remaining" decrement** based on time.
- **Empty state = silent**, not "Limited!" by default.

Write what's actually true. The addon styles it nicely.

## Versioning

`VERSION` constant lives at the top of `availability-banner.js`.
