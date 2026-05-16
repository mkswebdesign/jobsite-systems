# LatestPosts

Homepage section for blog brands. Shows the newest N published posts in a card grid plus a "View all" link to `/archive/`.

- **`type`:** `latestPosts`
- **Component:** `LatestPosts.astro`
- **Schema:** `latestPostsSection` in `src/content/config.ts`
- **Used by:** swift-digest

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"latestPosts"` |
| `eyebrow` | no | Small uppercase label above the heading. |
| `heading` | yes | Section heading. |
| `subhead` | no | Optional supporting line under the heading. |
| `limit` | no | How many posts to render (1-24). Default 6. |
| `viewAll` | no | `{ label, href }` for the "View all" link. |

## Behavior

Reads `getAllPosts()` from `src/builder/lib/posts.ts` (published only, sorted desc). For brands without a posts collection the grid is empty and the "no articles yet" placeholder shows instead.

## Variants

Declared as `data-section-variants="A:Default"`. One variant only — this is a homepage primitive, not a styled-up family.
