# CSS pattern snippets

Documented, brand-agnostic CSS recipes that have proven out across multiple sections or brands. **These files are not auto-imported.** They are reference snippets — promote a pattern by inlining it into `sections.css`, `decorations.css`, or a per-brand `brands/<id>.css`, attributing back to this file in a comment.

## When to add a snippet here

A pattern earns a snippet file when **all three** are true:

1. It's used in 3+ places already (sections, page styles, or brand files).
2. It is brand-agnostic — relies only on CSS vars (`--accent`, `--brand-surface`, `--brand-on-surface`, etc.), never hard-coded colors.
3. It has a clear single concept name (one decoration, one motion, one layout — not a kitchen sink).

If the pattern is single-brand polish, it stays in `src/builder/styles/brands/<id>.css`. If it is part of a section's skeleton, it stays in the section's CSS block. The patterns folder is for the in-between: shared visual tokens that brands and sections opt into.

## When to remove a snippet

- It was promoted into shared CSS (`sections.css` / `decorations.css` / `base.css`) and the file here is now redundant.
- It is unused — no brand or section opted into it within ~6 months of being added.

## How to use a snippet

Read the file, understand the concept, then **author it where you need it**. Do not `@import` from this folder into a brand or section file — the indirection makes the cascade harder to reason about. The snippet is documentation; the rule lives at the point of use.

## Index

| Pattern | File | Concept | Currently used by |
|---|---|---|---|
| _(none yet — extract opportunistically as patterns prove out)_ | | | |

## Conventions for new snippets

- **Filename:** `<concept>.css` (e.g. `accent-stripe.css`, `eyebrow-badge.css`).
- **Header comment:** name, what the pattern is, which CSS vars it relies on, where it's currently used, and the date it was extracted.
- **Brand-agnostic:** no hex codes, no font names, no brand-specific class names. Use CSS vars and generic class names (`.has-accent-stripe`, not `.landscape-systems__stripe`).
- **Motion-aware:** any animation must wrap in `@media (prefers-reduced-motion: no-preference)` or carry an inline reduced-motion fallback.

## Related

- Section CSS skeletons: `src/builder/styles/sections.css`
- Section background decorations + carousels: `src/builder/styles/decorations.css`
- Per-brand overrides: `src/builder/styles/brands/<brand>.css`
- Shared visual token inventory: [docs/global-edits.md](../../../../docs/global-edits.md) → "Shared visual tokens" table
