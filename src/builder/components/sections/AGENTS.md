# Section Library — Rules for AI Agents and Humans

Follow these when adding or modifying section types. Break one and you break the build, the editor, or the cross-brand portability guarantee.

**Before declaring a new section done:** run `npm run audit-sections`. It parses the Zod union and fails if any type is missing a doc, a README row, an example, or a `KNOWN_SECTION_TYPES` entry. CI does not gate on this; discipline does.

**Easiest path:** use the `/new-section <type-name>` skill. It walks the checklist below, stubs the files, and runs the audit + a build smoke test at the end.

## 1. Source of truth

- **Schema:** `src/content/config.ts` — the `pageSection` discriminated union. If a section type isn't in this union, it isn't a section.
- **Component:** `src/builder/components/sections/<Name>.astro` — one file per type.
- **Editor wiring (all three required on the root element — the CHIP-LBL and variant picker depend on them):**
  - `data-section-type="<kebab-name>"` — editor-facing identity. Drives the `.aed-sec-chip-label` pill shown on hover in edit mode. May differ from the Zod `type` literal (e.g., Zod `finalCta` / DOM `cta`, Zod `historyTeaser` / DOM `history-teaser`). Several components can share an identity (both `FinalCta` and `SiteCta` use `cta`) when they represent the same conceptual section.
  - `data-section-label="Human Readable Name"` — display label inside the CHIP-LBL. Without it the editor falls back to titlecasing `data-section-type`.
  - `data-section-variants="A:Label,B:Label,..."` — declares the variant picker. Every section needs this even if it only ships `A:Default` today.
- **Docs:** one `.md` per section in this folder — what it's for, fields, variants, example. The docs describe the code; the code decides behavior.

## 2. Adding a new section type

1. Add a Zod member to the `pageSection` discriminated union in `src/content/config.ts`.
2. Create `src/builder/components/sections/<Name>.astro`. Root element must carry **all three** editor attributes:

   ```astro
   <section
     class="<kebab-name>"
     data-section-type="<kebab-name>"
     data-section-label="Human Readable"
     data-section-variants="A:Default"
     ...
   >
   ```

   Without these the section is invisible to the in-page editor — no CHIP-LBL, no variant picker, no theme/visibility overrides. `audit-sections` will fail if any one is missing.

3. Participate in the **section-overrides system** (theme / visibility / parallax / accent). Base.astro applies these as data-attributes and CSS vars on any element with `data-section-type` before paint. Your component doesn't need code to *apply* them, but per-brand CSS for the section should be prepared to respect them:

   ```css
   .<kebab-name>[data-sec-disabled='on']   { /* Base.astro hides with display:none; keep this */ }
   .<kebab-name>[data-sec-theme='light']   { /* light theme override */ }
   .<kebab-name>[data-sec-theme='dark']    { /* dark theme override */ }
   .<kebab-name>[data-sec-parallax-bg='on']{ background-image: var(--sec-parallax-url); }
   .<kebab-name> .cta { background: var(--accent, var(--brand-surface)); }
   ```

   The keys Base.astro sets when the user picks an override in the editor or the brand ships baked overrides:
   `data-sec-theme` (light / dark / white / black / primary / secondary / vibrant), `data-sec-parallax-bg` (`on`), `data-sec-parallax-url` (CSS url), `data-sec-disabled` (`on`), and `--accent` / `--accent-rgb` CSS vars.

4. Add a `case` for the new `type` in every page route that composes via `sections[]` (currently `src/pages/index.astro` and anywhere else `sections[]` is iterated). Missed cases render blank.
5. Write `src/builder/components/sections/<Name>.md` — purpose, fields (cross-referenced to the Zod schema), variants, example, brand-override hints.
6. Add a row to `src/builder/components/sections/README.md`.
7. Add a canonical example to `content/_examples/sections.json`.
8. Add the type to `KNOWN_SECTION_TYPES` in `scripts/validate-brand.mjs`. If the section has cross-refs to collections, add a branch in `validateSection()`.
9. Run `npm run audit-sections` — must exit 0. Then run `BRAND=<any> npm run build:fast` — prebuild validator runs automatically.

## 3. Adding a variant to an existing section type

Variants are a **CSS-only** way to vary a section's appearance without forking the component.

1. Pick the next free letter, capped at `MAX_VARIANT_LETTER` in [src/builder/lib/variants.ts](../../lib/variants.ts) (currently `H`). Anything beyond the cap is silently dropped by `Base.astro`'s pre-paint sanitizer. If you genuinely need a wider cap, bump `MAX_VARIANT_LETTER` in `variants.ts` — both the runtime sanitizer in `Base.astro` and the build-time `audit-variants.mjs` derive from it. Lowercase letters and kebab tokens (`grid`, `compact`) are also valid keys, validated against `VARIANT_KEBAB_RE_SOURCE`.
2. Update `data-section-variants` on the component root so the editor knows the variant exists. The build's `audit-variants` step rejects any letter beyond the cap.
3. Add CSS selectors in `src/builder/styles/brands/<brand>.css` under `[data-<name>-variant='X'] { ... }`. Scope to a single brand unless you have explicit agreement to promote it. See [../../styles/brands/AGENTS.md](../../styles/brands/AGENTS.md) for the per-brand-CSS rules and the section-entrance motion scale.
4. Add a bullet in the section's `.md` describing what the variant looks like and when to use it.

**If a variant must fork the markup** (rare — `Testimonials.astro`'s `grid` / `carousel` / `slider` is the only current example), each branch's wrapper elements must carry classes prefixed with the section's `data-section-type` (e.g. `testimonials-carousel-wrapper`, `testimonials-slider__viewport`). The editor's SP-BLUEPRINT capture (`readBlueprintMarkupShape` in `edit.js`) only collects type-prefixed classes — unprefixed wrappers (`.slider-frame`) become invisible to the blueprint and an agent transplanting the look will silently miss the markup branch. Type-prefixing is already required by the per-brand-CSS scoping convention, so this is rarely an extra constraint, but call it out in the section's `.md` if you fork markup.

## 4. What does NOT belong in this folder

- **No per-section CSS file.** Shared CSS is a brand-sync leak risk (`arich_astro_sync_boundary.md`). If a pattern proves out across 3+ brands, *then* consider promoting tokens into `src/builder/styles/` — and only with explicit agreement.
- **No per-section `schema.json`.** The Zod union is the schema; duplicating is a drift tax.
- **No JS frameworks.** Inline `<script>` is fine for small, motion-respecting enhancements (see Hero, Why, Capabilities, ProcessSteps for the pattern). Always gate motion with `prefers-reduced-motion`.
- **No bypassing the editor wiring.** Every component in this folder — including non-union composition components like `SiteCta.astro` and `NextSteps.astro` — must carry the three `data-section-*` attributes. The audit enforces this across the whole folder.

## 5. Field naming conventions

- IDs/slugs that reference collections end in `Ids` / `Slugs` plural: `serviceSlugs`, `workSlugs`, `testimonialIds`, `faqIds`, `groupIds`. `validate-brand.mjs` auto-checks these.
- CTAs are `{ label, href }` objects named `ctaPrimary`, `ctaSecondary`, or just `cta`.
- Headings are `heading` (required on most), optional `sectionLabel` (eyebrow), optional `subtext` (below heading). Keep names consistent across sections — changing them means schema migration.

## 6. Cross-brand portability

A section that exists in the union must work for any brand whose `sections[]` references it. That means:

- No hardcoded brand strings in the component.
- No references to brand-specific collections (e.g., `best-by-year` is best-futbol only — don't let the homepage `historyTeaser` section type assume it exists; it gates on whether the collection entries exist).
- Per-brand visual decisions go in per-brand CSS. The component ships the skeleton.

## 7. When you break the rules

- Adding CSS to a component file or a shared stylesheet for a one-brand polish: **stop**, move it to `brands/<id>.css`. See [../../styles/brands/AGENTS.md](../../styles/brands/AGENTS.md).
- Needing a variant past the cap: **stop**, bump `MAX_VARIANT_LETTER` in [../../lib/variants.ts](../../lib/variants.ts) or consolidate existing variants. The audit will tell you which.
- Creating a parallel component like `HeroSplitImage.astro` for what should be a variant: **stop**, it's a variant letter in `Hero.astro`. Separate components are for genuinely different section *types*, not visual treatments.

## 8. See also

Runbooks for adjacent surfaces:

- [../../../../public/assets/builder/editor/AGENTS.md](../../../../public/assets/builder/editor/AGENTS.md) — when adding a new builder-injected section type or a new staged-work bucket in `edit.js`. Covers the full grep-and-mirror checklist for storage / render / panel / payload sites that have to move together.
- [../../styles/brands/AGENTS.md](../../styles/brands/AGENTS.md) — per-brand CSS boundary, section-entrance motion scale (typographic vs hero-scale), reduced-motion fallback rules.
