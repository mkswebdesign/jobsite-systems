# Process

Numbered steps explaining how you work — discovery → build → launch → support, or similar.

- **`type`:** `process`
- **Component:** `ProcessSteps.astro`
- **Schema:** `processSection` in `src/content/config.ts`
- **Used by:** all four brands

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"process"` |
| `sectionLabel` | yes | Eyebrow. |
| `heading` | yes | Section heading. Newlines render as line breaks. |
| `subtext` | no | |
| `steps` | yes | Array of `{ number, title, body }`. |
| `ctaLabel` | no | Optional "see full process" link. |
| `ctaHref` | no | Only renders the link when both label and href are present. |

### Step fields

| Field | Required | Notes |
|---|---|---|
| `number` | yes | Typically `"01"`, `"02"`, ... — rendered as-is. |
| `title` | yes | Step heading. |
| `body` | yes | One short paragraph. |

## Variants

Declared as `data-section-variants="A:Default,B:Vertical,C:Minimal"`.

- **A (Default)** — horizontal carousel of step cards.
- **B (Vertical)** — stacked, timeline-style.
- **C (Minimal)** — text-only, no cards.

None implemented in per-brand CSS currently.

## Behavior notes

- **Client-side JS:** the carousel has extensive keyboard + pointer support — 15 ARIA attributes in play, including `role="region"`, `aria-roledescription="carousel"`, `aria-label`, and `aria-expanded` on step triggers. `tabindex` is managed as the user navigates between slides.
- **Standalone vs service context:** `ProcessSteps.astro` accepts an `asService` prop when rendered inside a service page's detail view (different chrome, same content shape). The `sections[]` composition always uses the default mode.

## Brand override hints

```css
.process { }
.process__step { }
.process__number { /* the large numeral */ }
.process__cta { }
```

## Example

See `content/_examples/sections.json` → `process`.
