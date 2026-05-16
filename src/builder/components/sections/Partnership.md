# Partnership

"What's included" card. One large inset card listing benefits/deliverables with a single CTA. Used as a trust-builder near the bottom of the homepage before the final CTA.

- **`type`:** `partnership`
- **Component:** `Partnership.astro`
- **Schema:** `partnershipSection` in `src/content/config.ts`
- **Used by:** all four brands

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"partnership"` |
| `sectionLabel` | yes | Eyebrow. |
| `heading` | yes | Section heading (above the card). |
| `subtext` | no | |
| `cardTitle` | yes | Title inside the card. |
| `cardLead` | yes | Lead paragraph inside the card. |
| `benefits` | yes | Array of strings. Each becomes a checkbullet item. |
| `ctaLabel` | yes | CTA button label. |
| `ctaHref` | yes | CTA destination. |
| `note` | no | Small fine-print line below the CTA (pricing disclaimer, etc.). |

Benefits items support HTML entities for `&amp;`, but prefer raw `&` — the text renders through `{value}` which escapes. Only use entities if you're pasting from another source that already has them.

## Variants

Declared as `data-section-variants="A:Default,B:Minimal,C:Featured"`.

- **A (Default)** — standard card with checklist.
- **B (Minimal)** — no card chrome.
- **C (Featured)** — more prominent CTA, accent-tinted card.

None implemented in per-brand CSS currently.

## Behavior notes

- **No client-side JS.**
- One ARIA attribute in the markup (usually an `aria-label` on the CTA).

## Brand override hints

```css
.partnership { }
.partnership__card { }
.partnership__benefits { /* the ul */ }
.partnership__cta { }
```

## Example

See `content/_examples/sections.json` → `partnership`.
