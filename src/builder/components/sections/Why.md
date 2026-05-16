# Why

"Why us" value-prop band. Four or so cards, each with an icon + short body. Use between a hero and a deeper info section to set the stakes.

- **`type`:** `why`
- **Component:** `Why.astro`
- **Schema:** `whySection` in `src/content/config.ts`
- **Used by:** all four brands

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"why"` |
| `sectionLabel` | yes | Eyebrow. |
| `heading` | yes | Section heading. |
| `subtext` | no | |
| `cards` | yes | Array of `{ iconKey, title, body }`. Usually 3–6. |

### Card fields

| Field | Required | Notes |
|---|---|---|
| `iconKey` | yes | Maps to an `Icon` component (see `src/builder/components/Icon.astro` for available keys — examples: `layers`, `zap`, `check-circle`, `monitor`). |
| `title` | yes | Card heading. |
| `body` | yes | One or two short sentences. |

## Variants

Declared as `data-section-variants="A:Default,B:Flat,C:Dense,D:Alternating,E:Slider,F:Hairline"`.

- **A (Default)** — cards in a grid with soft panels.
- **B (Flat)** — no card chrome, just typography + icons. Implemented in `landscape-systems` CSS.
- **C (Dense)** — more cards per row, tighter spacing.
- **D (Alternating)** — zig-zag alignment for longer bodies.
- **E (Slider)** — marquee-style cloning of cards (inline JS handles the cloning, respects `prefers-reduced-motion` and `pointer: coarse`).
- **F (Hairline)** — thin-border treatment; very editorial.

## Behavior notes

- **Client-side JS:** card tilt effect on pointer; variant E clones cards for marquee. Both honor `prefers-reduced-motion` and skip on coarse pointers.
- **Accessibility:** cloned marquee cards carry `aria-hidden="true"`.

## Brand override hints

```css
.why { }
.why__grid { }
.why__card { }
.why[data-why-variant='E'] { /* marquee track styling */ }
```

## Example

See `content/_examples/sections.json` → `why`.
