# Hero

Top-of-page anchor. Always first on landing pages and most service landers. Sets the tone and drives the primary conversion via `ctaPrimary`.

- **`type`:** `hero`
- **Component:** `Hero.astro`
- **Schema:** `heroSection` in `src/content/config.ts`
- **Used by:** all four brands (every homepage)

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"hero"` |
| `headline` | yes | Main heading; keep to one clause. |
| `lead` | yes | One-sentence support under the headline. |
| `headlineAccent` | no | Second line of the headline, styled as accent color. |
| `badge` | no | Pill shown above the headline. |
| `badgeHref` | no | If present, the badge becomes a link. |
| `metaLabel` | no | Small label above `metaParts` row. |
| `metaParts` | no | Array of short strings shown as a bulleted row below the lead. |
| `ctaPrimary` | no | `{ label, href }` — primary action button. |
| `ctaSecondary` | no | `{ label, href }` — secondary action link. |
| `backgroundImages` | no | Array of URLs; hero rotates through them. |
| `backgroundImageInterval` | no | Seconds between rotations (default handled in CSS/script). |
| `trustMetrics` | no | Array of `{ value, label }` shown as a row of stats. |
| `imageCaption` | no | Small caption overlaid on the image. |

## Variants

Declared on root as `data-section-variants="A:Default,B:Split,C:Kinetic,E:Spotlight,F:Terminal,G:Stage,H:Pulse"`.

- **A (Default)** — centered heading over background image stack. Use for most landers.
- **B (Split)** — heading on one side, media/illustration on the other. Use when you have strong product imagery.
- **C (Kinetic)** — animated background, more energetic feel. Implemented in `landscape-systems` CSS.
- **E (Spotlight)** — concentrated gradient spotlight on the headline.
- **F (Terminal)** — monospaced, terminal-style framing. Implemented in `landscape-systems` CSS.
- **G (Stage)** — split-stage layout with rotating image cards.
- **H (Pulse)** — clean modern hero. Two looping brand-color signals: a soft accent halo that breathes behind the headline, and a single thin accent line near the visual center with a bright comet sweeping along it. Animated brand-color rhythm without heavy stacked layers.

Slot **D** was previously **Beam** (multi-layer light-beam motif) and was removed in favor of **H (Pulse)**. The slot is intentionally vacant — values of `D` from stale localStorage will fall back to the default look.

## Behavior notes

- **Client-side JS:** inline script for a parallax orb effect driven by `mousemove`. Respects `prefers-reduced-motion`; no-op on coarse pointers.
- **Responsive images:** `backgroundImages` are loaded as-is. Prefer `?auto=compress&cs=tinysrgb&w=1920` style URLs or self-hosted WebP to control weight.
- **Accessibility:** decorative SVG layers carry `aria-hidden`. Headline uses an `<h1>` — keep only one hero per page.

## Brand override hints

Target these in `src/builder/styles/brands/<brand>.css`:

```css
.hero { /* base container */ }
.hero[data-hero-variant='B'] { /* your split-image treatment */ }
.hero .hero__headline { /* typography */ }
.hero .hero__cta--primary { /* button chrome */ }
```

## Example

See `content/_examples/sections.json` → `hero`.
