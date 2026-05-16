# NewsroomHero

Content-forward homepage hero for blog brands. Surfaces real post data above the fold instead of a generic marketing pitch — pulsing LIVE dot + build-time date, scrolling headline ticker (links to `/post/{slug}/`), beat-nav pills sourced from `categories.json`, plus a featured top story (posts[0]) and a secondary stack (posts[1], posts[2], newsletter tile).

- **`type`:** `newsroomHero`
- **Component:** `NewsroomHero.astro`
- **Schema:** `newsroomHeroSection` in `src/content/config.ts`
- **Used by:** swift-digest

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"newsroomHero"` |
| `headline` | yes | Main `<h1>`. Keep to one clause. |
| `lead` | yes | One-sentence support under the headline. |
| `headlineAccent` | no | Trailing fragment of the headline rendered in the brand accent color. |
| `id` | no | DOM id on the `<header>`. Defaults to `hero`. |
| `liveLabel` | no | Text next to the pulsing dot. Defaults to `LIVE NEWSROOM`. |
| `tickerLimit` | no | Max posts in the headline ticker. Integer 3–24, default 12. |
| `newsletter` | no | `{ heading?, body?, cta: { label, href } }` — when present, renders the newsletter tile in the secondary stack. |

## Variants

Declared on root as `data-section-variants="A:Default"`.

- **A (Default)** — only variant today. Status bar + title row + beat nav + featured/secondary grid.

## Behavior notes

- **Data sourcing:** pulls posts via `getAllPosts()` and categories via `getAllCategories()` from `src/builder/lib/posts.ts`. Build-time only — no client fetch.
- **Empty-state:**
  - 0 posts → status bar shows "0 latest stories"; body renders only the title row + beat nav (skips featured + secondary).
  - 1 post → featured renders; secondary stack renders only the newsletter tile (if configured).
  - 2 posts → featured + 1 secondary card + newsletter tile.
- **Date staleness:** the build-time date and "new today" count are fixed at build time. Re-deploy daily (or trigger a scheduled rebuild) if a fresh date matters for your brand.
- **Accessibility:** the duplicated ticker list is `aria-hidden` on the second copy (animation-only). Beat pills carry per-category color via `--cat-color`.
