# AboutStrip

Short closing section for blog homepages — single heading + body paragraph + optional CTA. Distinct from `aboutSplit` (image + prose two-column) and `finalCta` (loud closing band).

- **`type`:** `aboutStrip`
- **Component:** `AboutStrip.astro`
- **Schema:** `aboutStripSection` in `src/content/config.ts`
- **Used by:** swift-digest

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"aboutStrip"` |
| `heading` | yes | Section heading. |
| `body` | yes | Single paragraph of supporting copy. |
| `cta` | no | `{ label, href }` for an inline link. |

## Variants

`A:Default` only.
