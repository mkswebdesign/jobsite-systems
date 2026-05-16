# AboutSplit

Image-on-left / text-on-right introductory block. The third member of the editorial trio: where DesignBreak is a full-bleed atmospheric breath and ContentSection is a typographic room, AboutSplit pairs prose with a single feature image side-by-side. Use it as a homepage about-teaser, a story-of-the-business band, or any place where one image plus 1–3 paragraphs needs to land together.

- **`type`:** `aboutSplit`
- **Component:** `AboutSplit.astro`
- **Schema:** `aboutSplitSection` in `src/content/config.ts`
- **Used by:** `landscape-systems` (homepage about-teaser).

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"aboutSplit"` |
| `heading` | yes | Section heading. Brand-voice declarative — this is the topic of the block. |
| `body` | yes | Single string OR array of strings. Each string becomes a `<p>`. 1–3 paragraphs reads strongest. |
| `image` | yes | Image URL. Rendered into `.about-split__media > img` with `loading="lazy"` and `decoding="async"`. Use a CDN URL pre-sized to ~1200px wide. |
| `cta` | yes | `{ label, href }`. The block is meant to drive a decision — give it a real destination. |
| `sectionLabel` | no | Optional 1–3 word eyebrow above the heading. |
| `imageAlt` | no | Decorative by default (empty alt). Set explicitly when the image carries information that the surrounding text doesn't already convey. |
| `variant` | no | `A` / `B` / `C` — see Variants. Defaults to `A`. |

## Editor wiring

Root element declares:
- `data-section-type="about-split"` (editor identity / CHIP-LBL key)
- `data-section-label="About split"` (CHIP-LBL display name)
- `data-section-variants="A:Default,B:Reversed,C:Compact"` (variant picker)

Participates in the section-overrides system — `Base.astro` applies `data-sec-theme`, `data-sec-disabled`, and `--accent` CSS vars. Per-brand CSS should respect these.

## Variants

Declared on root as `data-section-variants="A:Default,B:Reversed,C:Compact"`.

- **A (Default)** — image left, text right. The standard treatment.
- **B (Reversed)** — image right, text left. Use to alternate rhythm when two AboutSplit blocks appear on the same page.
- **C (Compact)** — image at smaller scale, body capped to one paragraph. Quieter, used as a mid-page beat rather than a feature.

Variant attr is set on `<html>` (e.g. `html[data-about-split-variant="B"]`), so per-brand CSS should select via a generic ancestor selector (`[data-about-split-variant='B'] .about-split__inner`).

## Theme / mode awareness

Participates in section-overrides via `data-sec-theme`:

- `data-sec-theme="primary"` — brand-primary surface (e.g. lime on landscape-systems), dark text.
- `data-sec-theme="light"` / `"white"` — light surface, dark text.
- `data-sec-theme="dark"` / `"black"` — dark surface, light text.
- _(no sec-theme)_ — inherits the current theme mode (vibrant / dark / bright).

## Behavior notes

- **No client-side JS.**
- **Accessibility:** image carries an empty `alt` by default (decorative). Override via `imageAlt` only when the image conveys information the prose doesn't. Heading is `<h2>` — safe on any page with an `<h1>` elsewhere.
- **Motion:** per the editor-injected section motion convention, brand CSS can apply the canonical `aedSectionElEnter` keyframe to `.about-split__eyebrow`, `.about-split__heading`, `.about-split__body` on a scroll-driven view timeline. Do not animate the CTA (hover transition fights the scroll-driven transform). Animate the body container, not each `<p>`.
- **Responsive image:** the markup is a single `<img>`, no `<picture>` / `srcset`. Use a CDN URL pre-sized for the largest expected render width (~1200px wide is plenty).

## Brand override hints

```css
.about-split { /* padding, surface */ }
.about-split__inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(1.5rem, 4vw, 3.5rem);
  align-items: center;
}
.about-split__media { /* aspect ratio, rounded corners, shadow */ }
.about-split__image { width: 100%; height: 100%; object-fit: cover; }
.about-split__heading { /* scale, weight, tracking */ }
.about-split__cta { /* button chrome */ }

[data-about-split-variant='B'] .about-split__inner {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
[data-about-split-variant='B'] .about-split__media {
  order: 2; /* swap visual order; markup order stays media-first for natural flow on mobile */
}
```

On narrow viewports collapse to a single column with the image on top, text below.

## Example

See `content/_examples/sections.json` → `aboutSplit`.
