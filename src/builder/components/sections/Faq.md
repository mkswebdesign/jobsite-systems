# FAQ

Accordion of frequently asked questions. Pulls entries from the brand's `faq.json` collection.

- **`type`:** `faq`
- **Component:** `FAQ.astro`
- **Schema:** `faqSection` in `src/content/config.ts`
- **Used by:** all four brands

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"faq"` |
| `sectionLabel` | yes | Eyebrow. |
| `heading` | yes | Section heading. |
| `subtext` | no | |
| `faqIds` | no | Array of individual FAQ ids from `faq.json`. Order preserved. |
| `groupIds` | no | Array of group ids from `faq.json` — pulls every FAQ inside the group(s). |

You can use `faqIds`, `groupIds`, or both. If neither is present, the component falls back to the first group in `faq.json`.

## `faq.json` structure (brand-side)

Each brand's `faq.json` can be either flat or grouped:

```json
{
  "groups": [
    {
      "id": "whats-included",
      "title": "What's Included",
      "faqs": [
        { "id": "included-pages", "question": "...", "answer": "..." }
      ]
    }
  ]
}
```

`validate-brand.mjs` reads both the `groups[].faqs[].id` and top-level `faqs[]` / `items[]` shapes — so either works.

## Variants

Declared as `data-section-variants="A:Default,B:Minimal,C:Narrow,D:Columns,E:Editorial,F:List,G:Featured"`. FAQ has the most declared variants of any section (7).

- **A (Default)** — standard full-width accordion.
- **B (Minimal)** — no card chrome, thinner dividers.
- **C (Narrow)** — narrower max-width, more editorial feel.
- **D (Columns)** — two-column layout for long FAQ lists.
- **E (Editorial)** — magazine-style with larger type.
- **F (List)** — no accordion; answers always visible.
- **G (Featured)** — first FAQ visually emphasized.

None implemented in per-brand CSS currently.

## Behavior notes

- **Accessibility:** accordion buttons use `aria-expanded` on the toggle. No inline JS — `<details>` + `<summary>` powers the accordion natively.
- **Cross-refs:** dangling `faqIds` or `groupIds` fail `validate-brand.mjs`.

## Brand override hints

```css
.faq { }
.faq__item { }
.faq__question { }
.faq__answer { }
.faq[data-faq-variant='D'] .faq__list { column-count: 2; }
```

## Example

See `content/_examples/sections.json` → `faq`.
