# Capabilities

Short "what we do" band. Usually renders a skills carousel (logos / tool badges / short capability pills) driven by site-level config, not inline content.

- **`type`:** `capabilities`
- **Component:** `Capabilities.astro`
- **Schema:** `capabilitiesSection` in `src/content/config.ts`
- **Used by:** all four brands

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"capabilities"` |
| `sectionLabel` | yes | Eyebrow. `""` is valid when you want only the heading. |
| `heading` | yes | Section heading. |
| `subtext` | no | |
| `useSkillsCarousel` | no | Defaults to `true`. When `true`, pulls skill items from the brand's `site.json` skillsCarousel config. When `false`, the section renders heading + subtext only. |

## Variants

Declared as `data-section-variants="A:Default,B:Minimal,C:Featured,D:Drift"`.

- **A (Default)** — carousel strip with standard pill styling.
- **B (Minimal)** — just text, no carousel (equivalent look when `useSkillsCarousel: false`).
- **C (Featured)** — larger badges, brand-tinted. Implemented in `landscape-systems` CSS.
- **D (Drift)** — auto-scrolling marquee.

## Behavior notes

- **Client-side JS:** inline script wires up the skills carousel — keyboard nav, `tabindex` management on cloned items. Seven ARIA attributes in the markup for carousel semantics.
- **Dependencies:** reads `skillsCarousel` from `site.json`; if absent, the carousel renders empty — the section still takes layout space.

## Brand override hints

```css
.capabilities { }
.capabilities__carousel { }
.capabilities__skill { /* individual pill */ }
```

## Example

See `content/_examples/sections.json` → `capabilities`.
