# Divider

A thin decorative horizontal rule between two authored sections. Staged
via the gomks builder's divider-gap button (the second pill on every
gap rail). Editor-injected primitive — never authored by hand.

## When to use

Between two sections that need a quiet visual beat — a hairline rest
that doesn't compete with content. Pairs especially well between dense
typographic sections. For bigger atmospheric breaks (image + heading +
CTA), use `designBreak` instead. For a wave / shape between sections,
this is NOT it — the divider is intentionally a flat line.

## Schema

```jsonc
{
  "type": "divider",
  "color": "dark"   // "dark" | "light" | "primary" | "secondary"
}
```

`color` is the only authored field. All four values map to brand-theme
CSS custom properties at render time, so the chosen line stays visible
across vibrant / dark / light theme modes:

- **dark** → `var(--text-primary)` (text color — auto-flips per theme)
- **light** → `var(--text-muted)` with `--text-secondary` fallback
- **primary** → `var(--accent)` (brand primary)
- **secondary** → `var(--accent-secondary)` with fallback chain

## Variants

None. The `color` field is a JSON prop, not a CSS variant. The
component declares `data-section-variants="A:Default"` only because
every file under `sections/` must declare the attr for the editor's
variant picker to mount.

## Brand-CSS overrides

Default geometry: 1px solid line, `clamp(2.5rem, 6vw, 4.25rem)` of
vertical breathing room, `min(80%, 520px)` width, centered. Brands
that want a different treatment (double border, longer rule, etc.)
override `.bordered-divider[data-color="<id>"]` in their per-brand
CSS file at `src/builder/styles/brands/<brand>.css`.

## Accessibility

Renders as `<hr aria-hidden="true">` — purely decorative; never
introduces a semantic break in the document outline.
