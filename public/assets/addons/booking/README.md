# Booking — portable calendar embed

A drop-in folder. Iframe-based modal + inline embed for Cal.com,
Calendly, and SavvyCal. Configure once per site with a `<meta>` tag,
then trigger from anywhere with a simple `data-` attribute. No
third-party JavaScript required.

## What's in this folder

| File | Role |
|---|---|
| `booking.css` | Modal scrim + dialog, inline embed wrapper, loading state. Theme-aware. |
| `booking.js` | Provider URL builder, modal management, lazy-mounted inline embed (IntersectionObserver), trigger wiring. |
| `README.md` | This file. |

## Integration in a new site

### Step 1 — copy the folder

Drop `public/addons/booking/` into your `public/` directory.

### Step 2 — link the CSS in `<head>`

```html
<link rel="stylesheet" href="/addons/booking/booking.css" />
```

### Step 3 — load the JS before `</body>`

```html
<script defer src="/addons/booking/booking.js"></script>
```

### Step 4 — configure your default booking link

```html
<meta name="aed:booking" content="cal:anthonyrichter/15min" />
```

Token format is `<provider>:<path>`. Three providers ship by default:

| Provider | Token format | Resolves to |
|---|---|---|
| `cal` | `cal:user/event-type` | `https://cal.com/user/event-type?embed=true&theme=…` |
| `calendly` | `calendly:user/event-type` | `https://calendly.com/user/event-type?embed_type=Inline&hide_landing_page_details=1&hide_gdpr_banner=1` |
| `savvycal` | `savvycal:user/event-type` | `https://savvycal.com/user/event-type/embed` |

The current `<html data-theme>` is passed to providers that support it
(currently Cal.com).

### Step 5 — trigger a modal from anywhere

```html
<button data-aed-booking-trigger>Book a call</button>
```

Without a value, the button uses the default token from the meta tag.
Pass an explicit token to override on a per-button basis:

```html
<button data-aed-booking-trigger="cal:anthonyrichter/30min">30-minute deep dive</button>
<a href="#" data-aed-booking-trigger="calendly:anthony/intro">Free intro call</a>
```

### Step 6 — (optional) inline embed

Drop a div anywhere on a page:

```html
<div data-aed-booking-inline></div>

<!-- with explicit token + a taller minimum height -->
<div data-aed-booking-inline="cal:anthony/15min" style="min-height:720px"></div>
```

Inline embeds are lazy-mounted when they scroll into view (200px
root-margin), so a calendar in the footer doesn't load on first paint
of the homepage.

## Behavior

- **Iframe-based**: no third-party scripts injected into your page. The
  provider only loads inside the iframe sandbox.
- **Lazy inline embeds**: not mounted until they're near the viewport.
- **Modal cleanup**: closing the modal removes the iframe entirely so
  any in-progress video/audio stops.
- **Body scroll lock**: while the modal is open.
- **Esc + click-outside**: close the modal.
- **Theme-aware**: passes `?theme=light` or `?theme=dark` to providers
  that read it.
- **Print mode**: hidden in `@media print`.
- **Reduced motion**: spinner + transitions softened.

## Public API

```js
window.__booking.open()                          // default token
window.__booking.open('cal:anthony/30min')       // explicit
window.__booking.close()
window.__booking.parse(token)                    // { provider, path, url }
window.__booking.attach(button)                  // wire up an element added later
window.__booking.mountInline(div)                // lazy-mount an inline div added later
```

## Hooking into other addons

### Add a "Book a call" item to `/contact-fab/`

```html
<script type="application/json" id="aed-contact-fab-config">
{
  "actions": [
    { "kind": "calendar", "label": "Book a call", "sublabel": "15-minute intro",
      "href": "javascript:void(__booking.open())" }
  ]
}
</script>
```

Or use a real link as a fallback (works without JS):

```html
{ "kind": "calendar", "label": "Book a call",
  "href": "https://cal.com/anthony/15min", "target": "_blank" }
```

…and pair it with a `data-aed-booking-trigger` button elsewhere on the
page for the in-modal experience.

## Adding a custom provider

In `booking.js`, the `PROVIDERS` object maps provider name → URL builder.
Add another:

```js
PROVIDERS.tidycal = function (path, opts) {
  return 'https://tidycal.com/' + path + '?embed=1';
};
```

Now `<meta name="aed:booking" content="tidycal:anthony/15">` works.

## Versioning

`VERSION` constant lives at the top of `booking.js`. Bump on change.
