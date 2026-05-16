# TagCloud (section)

Homepage section that renders a tag cloud — chip-sized-by-usage with each chip linking to `/tag/<slug>/`.

- **`type`:** `tagCloud`
- **Component:** `TagCloudSection.astro` (the standalone `TagCloud.astro` primitive is a non-section helper used inside this section and elsewhere).
- **Schema:** `tagCloudSection` in `src/content/config.ts`
- **Used by:** swift-digest

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"tagCloud"` |
| `eyebrow` | no | Small uppercase label above the heading. |
| `heading` | yes | Section heading. |
| `limit` | no | Top N tags by usage count (1-50). Default 20. |

## Behavior

Reads `getAllTags()` (deduped, with usage counts), sorts by count desc, slices to `limit`. Chip size weight scales with relative usage.

## Variants

`A:Default` only.
