# HistoryTeaser

Narrow-scope section: a homepage band teasing the `/best/<year>/<club>/` archive pages. Currently used only by `best-futbol`. Ships in the union because the component itself is brand-agnostic — any brand that adds year-keyed archival content could reuse it.

- **`type`:** `historyTeaser`
- **Component:** `HistoryTeaser.astro`
- **Schema:** `historyTeaserSection` in `src/content/config.ts`
- **Used by:** `best-futbol` only

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"historyTeaser"` |
| `heading` | yes | Section heading. |
| `sectionLabel` | no | Eyebrow. |
| `subtext` | no | |
| `cta` | yes | `{ label, href }` — the link to the archive. |

## Variants

No `data-section-variants` declared on this component. If variants are needed, declare them on the root `<section>` first.

## Behavior notes

- **No client-side JS.** A `data-aed-cursor-spotlight` attribute enables the editor-overlay spotlight when hovered (no runtime effect in production).
- **Cross-brand portability:** the component does not hardcode `/best/` — the `cta.href` decides the destination. Any brand that wants a year-indexed archive can set up its own `best-by-year`-style collection and reuse this section. Unless and until that happens, treat it as `best-futbol`-specific in composition.

## Brand override hints

```css
.history-teaser { }
.history-teaser__heading { }
.history-teaser__cta { }
```

## Example

See `content/_examples/sections.json` → `historyTeaser`.
