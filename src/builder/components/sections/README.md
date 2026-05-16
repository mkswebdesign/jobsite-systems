# Section Library

Reusable page sections driven by JSON. One Astro component per section type, composed into a page via the `sections[]` discriminated-union array in `pages/<slug>/page.json` (or the legacy flat `pages/<slug>.json`).

- **Adding a section or variant?** Read `AGENTS.md` first — it lists the hard rules and the exact steps.
- **Canonical examples:** `arich-source/content/_examples/sections.json` — one ready-to-paste object per section type.
- **Schema (source of truth):** `src/content/config.ts` → `pageSection` discriminated union.

## Section index

| Type | Component | Purpose | Variants declared | Used by |
|---|---|---|---|---|
| [`hero`](./Hero.md) | `Hero.astro` | Top-of-page anchor + primary CTA | A–C, E–H | all 4 brands |
| [`services`](./Services.md) | `ServicesGrid.astro` | Grid of cards from the `services/` collection | A–F | all 4 brands |
| [`work`](./Work.md) | `WorkGrid.astro` | Portfolio grid from the `work/` collection | A | arich, best-futbol |
| [`why`](./Why.md) | `Why.astro` | "Why us" value-prop cards | A–F | all 4 brands |
| [`capabilities`](./Capabilities.md) | `Capabilities.astro` | Skills/tools carousel band | A–D | all 4 brands |
| [`testimonials`](./Testimonials.md) | `Testimonials.astro` | Client quotes from `testimonials.json` (or inline `items[]`) | A–G | all 4 brands |
| [`process`](./Process.md) | `ProcessSteps.astro` | Numbered step-by-step band | A–C | all 4 brands |
| [`partnership`](./Partnership.md) | `Partnership.astro` | "What's included" inset card | A–C | all 4 brands |
| [`faq`](./Faq.md) | `FAQ.astro` | Accordion of FAQs from `faq.json` | A–G | all 4 brands |
| [`historyTeaser`](./HistoryTeaser.md) | `HistoryTeaser.astro` | Teaser for year-archive pages | none | best-futbol only |
| [`designBreak`](./DesignBreak.md) | `DesignBreak.astro` | Visual breather band with background + simple CTA | A–D | landscape-systems |
| [`aboutSplit`](./AboutSplit.md) | `AboutSplit.astro` | Image-left / text-right intro block with CTA | A–C | landscape-systems |
| [`contentSection`](./ContentSection.md) | `ContentSection.astro` | Text-only editorial block (prose, essays, case studies) | A–C | not yet adopted |
| [`statRibbon`](./StatRibbon.md) | `StatRibbon.astro` | Horizontal strip of proof points (number + label) | A–C | not yet adopted |
| [`photoGallery`](./PhotoGallery.md) | `PhotoGallery.astro` | Multi-image showcase (grid / masonry / carousel) | A–C | not yet adopted |
| [`photoSlider`](./PhotoSlider.md) | `PhotoSlider.astro` | Auto-advancing photo slider — fade-cinema (A), carousel-marquee (B), slim-marquee (C), full-bleed slim (D) | A–D | not yet adopted |
| [`versusBlock`](./VersusBlock.md) | `VersusBlock.astro` | Head-to-head comparison band (paired "from / to" rows) | A–B | landscape-systems |
| [`trustBand`](./TrustBand.md) | `TrustBand.astro` | Thin single-line icon+text strip (brand-default or inline) | A | clinician-systems, jobsite-systems |
| [`finalCta`](./FinalCta.md) | `FinalCta.astro` | Closing conversion band | A–G (+ H, see caveat) | all 4 brands |
| [`divider`](./Divider.md) | `Divider.astro` | Decorative bordered horizontal rule (4 theme-aware colors) | (none — `color` JSON prop) | builder-injected |
| [`latestPosts`](./LatestPosts.md) | `LatestPosts.astro` | Homepage grid of recent blog posts + "View all" | A | swift-digest |
| [`categoryLinks`](./CategoryLinks.md) | `CategoryLinks.astro` | Homepage grid of category cards | A | swift-digest |
| [`tagCloud`](./TagCloud.md) | `TagCloudSection.astro` | Homepage tag cloud (chip-sized by usage) | A | swift-digest |
| [`aboutStrip`](./AboutStrip.md) | `AboutStrip.astro` | Short closing about section + optional CTA | A | swift-digest |
| [`newsroomHero`](./NewsroomHero.md) | `NewsroomHero.astro` | Content-forward homepage hero for blog brands — live status bar + headline ticker, beat-nav pills, featured top story + secondary stack | A | swift-digest |
| [`homeArchive`](./HomeArchive.md) | `HomeArchive.astro` | Inline embed of the `/archive/` filtering UI (segmented + drawer + sort + view) below the homepage hero, capped at top-N with "View the full archive →" CTA | A | swift-digest |

**Variants declared** = what's in the component's `data-section-variants` attribute. **Implemented in CSS** is usually sparser — at the time of writing, only `landscape-systems` ships per-brand variant CSS overrides. See each `.md` for which variants have actual visual distinction today.

## Conventions

- **Type naming:** lowercase, single word when possible (`hero`, `services`, `faq`); camelCase for multi-word (`historyTeaser`, `finalCta`). The Zod literal, the component's switch case, and the `.md` filename all agree on the casing.
- **Component naming:** PascalCase, matching the conceptual section name. `ServicesGrid.astro` and `ProcessSteps.astro` are the two cases where the component filename is more specific than the type.
- **Variants:** capital letters `A`–`H` on the `data-<type>-variant` attribute. **Do not use `I` or beyond** without widening the sanitizer regex in `Base.astro` — see `FinalCta.md` (variant `H`) and `Hero.md` (variant `H` Pulse) for places this has already been stretched.
- **Cross-refs** (`serviceSlugs`, `workSlugs`, `testimonialIds`, `faqIds`, `groupIds`) are validated by `scripts/validate-brand.mjs` — dangling refs fail the build.

## Also in this folder but not in the `sections[]` union

These components exist in `src/builder/components/sections/` but are composed via named keys on interior pages, not the `sections[]` array:

- **`SiteCta.astro`** — reusable CTA band used across interior pages (variants `A:Default,B:Framed`).
- **`NextSteps.astro`** — "what happens next" block used after form submissions and on interior flows (variants `A:Panel,B:Centered`).

They follow the same variant conventions but have no discriminated-union entry because they're slotted by name, not by type. If they ever need to be composable via `sections[]`, add them to the Zod union and follow the steps in `AGENTS.md`.

## Interior-page named blocks

The `.passthrough()` on the pages Zod schema lets interior pages use custom top-level keys instead of `sections[]`. These are NOT section types and each page route renders them directly:

| Page | Named blocks |
|---|---|
| `about` | `header`, `intro`, `philosophy`, `capabilities`, `workShowcase`, `testimonials`, `cta` |
| `services` | `header`, `grid`, `testimonials`, `cta` |
| `work` | `header`, `grid`, `testimonials`, `cta` |
| `pricing` | `header`, `oneOff`, `grid`, `testimonials`, `faq`, `cta` |
| `process` | `header`, `intro`, `deliverable`, `finalCta` |
| `contact` | `header`, `form`, `testimonials`, `sidebar`, `expect`, `link` |
| `faq` | `header`, `cta` |

When building a new interior page, the choice between `sections[]` composition and named blocks is pragmatic: use `sections[]` for landing-style pages where order matters and section count varies; use named blocks for structured pages with a fixed skeleton.
