# CategoryLinks

Homepage section for blog brands. Renders a grid of category cards with name, description, and post count, each linking to `/category/<slug>/`.

- **`type`:** `categoryLinks`
- **Component:** `CategoryLinks.astro`
- **Schema:** `categoryLinksSection` in `src/content/config.ts`
- **Used by:** swift-digest

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"categoryLinks"` |
| `eyebrow` | no | Small uppercase label above the heading. |
| `heading` | yes | Section heading. |
| `subhead` | no | Optional supporting line. |

## Behavior

Reads `getAllCategories()` and computes per-category post counts. Card accent color comes from each category's `color` token in `categories.json`.

## Variants

`A:Default` only.
