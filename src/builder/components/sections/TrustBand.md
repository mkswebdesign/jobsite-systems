# TrustBand

Thin single-line strip of 3–6 icon+text pills with an optional "Learn more"
link. Two render modes:

1. **Brand-default** — when a brand declares `trustBand` in its `brand.json`,
   the strip renders below the hero (and on `/pricing/`, `/services/lead-forms/`
   in the brands that opt in via direct component import).
2. **Inline page section** — authored as `{ "type": "trustBand", ... }` inside
   any page's `sections[]` array. Items/cta on the section override the brand
   defaults for that one render.

Used today by `clinician-systems` (HIPAA / non-PHI / 7-day-build trust framing)
and `jobsite-systems` ("Trades we serve" strip slot). Available to any brand —
the component is brand-agnostic; the copy is what makes it specific.

## When to use

When you need a **thin, scannable trust beat** — a single horizontal strip of
icon + short phrase, the kind of thing readers parse in under two seconds. Use
it where the hero just landed and you need one more pass-through of the four
proof points before the page does any real work.

For a deeper, multi-column "Why us" treatment use `why` instead. For a number-
heavy proof beat use `statRibbon`. For a paired comparison use `versusBlock`.

## Schema

### As a brand-default (`brand.json`)

```jsonc
{
  "trustBand": {
    "items": [
      { "iconKey": "shield", "text": "HIPAA-aligned by design" },
      { "iconKey": "lock",   "text": "No PHI in the form path" },
      { "iconKey": "clock",  "text": "Live in seven days" }
    ],
    "cta": { "label": "How we keep PHI out", "href": "/process/" }
  }
}
```

### As a page section (`pages/<slug>/page.json`)

```jsonc
{
  "type": "trustBand",
  "items": [
    { "iconKey": "check", "text": "OFA hip & elbow cleared" },
    { "iconKey": "check", "text": "CERF eyes & cardiac cleared" },
    { "iconKey": "check", "text": "Hunt-tested across four seasons" }
  ],
  "cta": { "label": "See full clearance paperwork", "href": "/contact/" }
}
```

`iconKey` resolves through the shared `Icon.astro` registry. Any key in that
registry works — common picks: `shield`, `lock`, `check`, `clock`, `star`,
`zap`, `award`. Unknown keys fall through to a generic dot.

`href` on an individual item is read by the schema but not currently rendered
by the component (items are static text). Keep it in your JSON if you'd like
forward-compat — the component will surface it when the variant lands.

## Variants

Only `A:Default` is declared (single horizontal strip). The component is
intentionally one-shape: when a brand needs a different visual treatment, the
right move is per-brand CSS overriding `.trust-band` selectors in
`src/builder/styles/brands/<brand>.css` rather than adding variants here.

## Brand-CSS overrides

The strip's accent tint is driven by the brand's `--accent` token via
`color-mix()`. Brands that want a fully custom look should target:

- `.trust-band` (background, border block)
- `.trust-band__icon` (pill behind each glyph)
- `.trust-band__text` (font weight / size / color)
- `.trust-band__cta` (link styling)

Mobile: the breakpoint at 640px relaxes whitespace and lets pill text wrap
rather than horizontal-scrolling. Keep that behavior in any brand override.

## Accessibility

The wrapper is a `<section aria-label="Trust signals">`. Items render in a
`<ul role="list">` so each pill is announced as a list item. Icon glyphs are
`aria-hidden="true"` since the `text` carries the meaning.
