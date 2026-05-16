# HomeArchive

Embeds the full `/archive/` filtering UI inline below the homepage hero on blog brands. Composes the existing **ArchiveToolbar + ArchiveList + ArchiveDrawer** trio (the same components that power `/archive/`, `/category/<slug>/`, and `/tag/<slug>/`) — segmented categories with counts, Refine drawer (search, tags, authors, date presets/range, reading-time slider), Sort menu, View toggle, and active-chips strip. Capped at top-N posts on the homepage, with a "View the full archive →" CTA below the grid for paging into `/archive/` (preserving any drawer-active querystring).

- **`type`:** `homeArchive`
- **Component:** `HomeArchive.astro`
- **Schema:** `homeArchiveSection` in `src/content/config.ts`
- **Used by:** swift-digest

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"homeArchive"`. |
| `eyebrow` | no | Small uppercase label above the heading. |
| `heading` | yes | Section heading (h2). |
| `subhead` | no | Supporting line under the heading. |
| `limit` | no | How many posts to render (3–24). Default `12`. Also caps client-mode (drawer-filtered) results — when a filter matches more, a "View all N matching →" CTA appears below the grid. |
| `viewAll` | no | `{ label, href }` for the "View the full archive →" link below the grid. Defaults to `{ label: "View the full archive", href: "/archive/" }`. Pass explicit values to override. |
| `variant` | no | Single letter A–H. Currently only `A:Default` is implemented. |

## Behavior

Reads `getAllPosts()`, `getAllCategories()`, `getAllTags()`, `getAllAuthors()` from `src/builder/lib/posts.ts` — the same data sources `/archive/` uses. Top-`limit` posts are passed to `ArchiveList`; the toolbar's segmented "All" / per-category counts reflect the **full corpus** (so the segmented is a "drill into the full archive" affordance, not a "what's on this homepage embed" affordance).

The section root carries `class="home-archive"` so the shared toolbar JS recognizes it (additive to the JS's existing `.archive-page, .category-detail-page, .tag-page` selector list — sibling brands without `.home-archive` are unaffected). The root also carries `data-result-limit={limit}` which opts the toolbar JS into top-N capping for client-mode filter results plus the truncation CTA.

Pagination is suppressed by passing `totalPages={1}` to `ArchiveList` — `Pagination.astro` self-suppresses at `totalPages <= 1`. The "View the full archive" CTA is the homepage's pagination affordance.

URL sync: drawer-driven filters (`?tag=`, `?author=`, `?from=`, `?to=`, `?preset=`, `?sort=`, `?view=`, `?q=`, `?rt=`) are written to the homepage URL via `history.replaceState`, same mechanism as `/archive/`. The truncation CTA's href preserves the live querystring so a user filtering on `/` and then clicking "View all N matching →" lands on `/archive/` with the same filters applied.

Empty-state: when no posts exist, `ArchiveList` renders its own `archive-list__empty` block with a "Browse all articles →" link — same behavior as the standalone archive route.

## Variants

Declared as `data-section-variants="A:Default"`. One variant only — this is a homepage primitive, not a styled-up family. A future "editorial mixed-size grid" variant would be natural here if the brand wants a hero-card-plus-grid layout instead of the uniform 3-up card grid.

## Brand override hints

The toolbar/list/drawer styling lives in shared `sections.css` — the homepage embed inherits all of it so the look matches `/archive/` exactly. Per-brand styling for the title row + view-all CTA lives in `src/builder/styles/brands/<brand>.css` under `.home-archive*` selectors. Only the title row, the section padding, and the trailing "View the full archive →" link are brand-paintable; everything inside the toolbar/list/drawer is shared.

The component respects the section-overrides plumbing (`[data-sec-disabled='on']` → `display: none`).

## Example

```json
{
  "type": "homeArchive",
  "eyebrow": "Latest reporting",
  "heading": "Featured stories.",
  "subhead": "Filter, sort, or browse by beat — same controls as the full archive.",
  "limit": 12,
  "viewAll": { "label": "View the full archive", "href": "/archive/" }
}
```
