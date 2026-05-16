# Work

Portfolio / case-study grid. Each card pulls from the brand's `work/` collection entries.

- **`type`:** `work`
- **Component:** `WorkGrid.astro`
- **Schema:** `workSection` in `src/content/config.ts`
- **Used by:** `arich`, `best-futbol`. Not used by `gomks` or `landscape-systems` (neither has enough work to feature on the homepage yet).

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"work"` |
| `sectionLabel` | yes | Eyebrow. |
| `heading` | yes | Section heading. |
| `subtext` | no | |
| `workSlugs` | yes | Array of slugs from the brand's `work/` collection. Order preserved. Validated by `validate-brand.mjs`. |
| `viewAllLabel` | no | Label for the optional "view all" link. |
| `viewAllHref` | no | Destination of the view-all link (usually `/work/`). Only renders the link when both label and href are present. |

## Editor wiring

Root element declares:
- `data-section-type="work"` (editor identity / CHIP-LBL key)
- `data-section-label="Work"` (CHIP-LBL display name)
- `data-section-variants="A:Default"` (variant picker — only default ships today)

## Variants

Declared as `data-section-variants="A:Default"` only — the component currently ships a single layout. To add more, append `B:Label,...` to the attribute and add per-brand CSS selectors keyed on `[data-work-variant='B']`.

## Behavior notes

- Fetches `work` collection; renders `WorkCard` components for each slug.
- Card content (gradient preset, metrics, testimonial, etc.) is authored on the `work/<slug>.json` file, not in this section.
- **Dead refs:** unresolvable `workSlugs` break the build; `validate-brand` catches them.

## Brand override hints

```css
.work { }
.work__grid { }
.work__card { }
.work__view-all { }
```

## Example

See `content/_examples/sections.json` → `work`.
