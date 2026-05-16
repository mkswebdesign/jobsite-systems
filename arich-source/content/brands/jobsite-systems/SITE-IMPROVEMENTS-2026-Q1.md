# site-improvements-2026-q1 — deliverables

Branch name reserved by the spec; neither `arich-astro/` nor `arich-source/`
is a git repo, so changes were made directly on disk in both repos. Run
`git init && git add -A && git commit && git checkout -b site-improvements-2026-q1`
in each repo if you want to capture this as a branch before any other work.

Smoke build (`BRAND=jobsite-systems npx astro build`): **80 pages, 0 errors**.

The 25-item spec ran across both repos. This doc groups what shipped in this
pass, what's flagged for **copy approval before deploy**, and what is left as
explicit TODOs for follow-up work — including the screenshots requirement,
which can't be produced from this environment without browser tooling.

---

## Files changed

### `arich-source/content/brands/jobsite-systems/`
- `site.json` — promo bar copy simplified (#10).
- `testimonials.json` — re-attributed `Pilot client · …` to `[City, State] · [Trade]` for all five testimonials (#23). City drafts written in; **need owner sign-off**.
- `pages/home/page.json` — swapped redundant `01b1-why-us-split.json` reference for new `01b1-trades-served.json` (#11).
- `pages/home/sections/01-hero.json` — H1, lead, badge, primary CTA, microcopy (#8 #9 #15). **Awaits copy approval.**
- `pages/home/sections/08-faq.json` — added `openIds: ["homepage-cancellation"]` (#14).
- `pages/home/sections/10-design-break.json` — variant changed from `J` to `B` (`J` is landscape-systems-only; CTA was unstyled here) (#1).
- `pages/home/sections/01b1-trades-served.json` — **NEW**. TrustBand-typed strip, 8 trade pills, `cta.href: "#"` until trade landing pages exist (#11).
- `pages/about/page.json` — `testimonials` block dropped + matching divider removed (#22).
- `pages/services/page.json` — `testimonials` block dropped + matching divider removed; TODO recorded for service-specific quotes (#22).
- `pages/pricing/page.json` — testimonials filtered to single ROI quote (Amanda R.) with new section heading "What it changed" (#22).
- `pages/work/page.json` — added `demoBuildsBanner`, `grid.layout: "static"`, dropped duplicated testimonials block + divider (#2 #22).
- `work/more-coming.json` — copy refreshed (no longer references the broken-image placeholder URL) (#2).

### `arich-astro/`
- `src/builder/components/WorkCard.astro` — replaced external `placehold.net/main.svg` dependency with an inline SVG site mockup that renders whenever `image` is null (covers Cedar Mill / Apex / more-coming / future placeholders) (#2).
- `src/pages/work.astro` — renders new `demo-builds-banner` above cards; switches to centered static grid for `grid.layout: "static"` or ≤3 items, otherwise keeps the carousel intact (#2).
- `src/builder/components/sections/FAQ.astro` — added `openIds: string[]` prop alongside the existing `openFirst`; matching items render with `aria-expanded="true"` and `class="open"`, and the inline init script computes `max-height` so they're visible on first paint (#14).
- `src/pages/index.astro` — added `trustBand` case to the section-type dispatch so brand-authored Trades-we-serve strips render (#11).
- `src/content/config.ts` — added `trustBandSection` Zod variant to `pageSection` union; added `openIds` field to `faqSection`.
- `src/builder/components/Icon.astro` — added `droplet`, `hammer`, `hat` icons (used by the trades strip).
- `src/builder/styles/brands/jobsite-systems.css` — single appended block at the end of the file covers: design-break CTA contrast pin (#1), Pricing nav pill replacement with dot indicator (#3), interior PageHeader vertical compression (#5), reveal animation fallback (#7), work-card mockup colorway (#2), static work-grid layout (#2), demo-builds banner styling (#2), floating-CTA mobile-FAB + collision hide (#6).
- `public/assets/addons/floating-cta/floating-cta.js` — added `nearOtherCta()` proximity check + `data-near-cta` attribute on the floating pill (CSS hides it when collision is detected). Fully backwards-compatible; opt-out via `nearCtaSelector: null` in any brand's `site.json` addon config (#6).

---

## What requires copy approval before deploy

These are **drafted in JSON but flagged with `_TODO_…` keys** and should be
reviewed by the owner before any deploy:

1. **Homepage H1 + lead + primary CTA** (`01-hero.json`):
   - H1: *"A website shouldn't be another thing you have to manage between jobs."*
   - Lead: *"Simple, working websites for trade businesses. One flat monthly price. No plugins, no logins, no surprises — just a site that brings in estimate requests while you're on the job."*
   - Primary CTA: `Book an Intro Call → /contact/` (was `Start Your Site → /start/`)
   - Microcopy: `Cancel anytime · Month-to-month · You own your content`

2. **Hero badge** (`01-hero.json`): `**First cohort** · 1–2 weeks from call to live site` (was *"Now onboarding trade businesses"*)

3. **Promo bar** (`site.json` `announcement-bar` addon): `Annual billing saves **30%** — sites from $129/mo.` (date countdown removed; the source date `2026-07-19` is still ~10 weeks away, borderline per spec — confirm whether to restore the deadline closer to expiry)

4. **Testimonial cities** (`testimonials.json`): Tulsa OK · Greensboro NC · Boise ID · Denver CO · Spokane WA. These are placeholders matching the trade niches; **each pilot client should confirm their own city before publication**.

---

## Wave 2 (2026-05-05) — formerly deferred items now landed

- **#12 — Services list 2x3 card grid with icons.** Brand-CSS pin forces `.services-grid` to render as 3-col / 2-col / 1-col responsive grid. Service iconKeys updated per spec: starter-site → `layout-grid`, lead-forms → `mail`, local-seo → `search`, photo-galleries → `image`, hosting-care → `shield`, email-management → `at-sign`. Added `search`, `at-sign`, `mail`, `layout-grid` icons to `Icon.astro`.
- **#13 — Un-carousel the homepage "How it works".** Set `variants.process: "B"` in `pages/home/page.json`. Brand-CSS overrides `[data-process-variant="B"] .process-track` to render all 6 steps as a 3x2 grid with carousel controls hidden. Variant B's existing scroll-engagement JS path replaces the carousel autoplay.
- **#16 — About comparison table.** Added `aboutCompare` field to `pages/about/page.json` with 6 comparison rows (Discovery, Design rounds, Hosting, Pricing model, Estimate requests, Total time) and the "Built once. Earning quietly." pull-quote. Inline `<table class="about-compare-table">` rendered by `about.astro` — brand-isolated, no addon dependency.
- **#17 — About "WordPress" wall-of-text breakup.** Extended `ContentSection.astro` with a backwards-compatible `bodyBlocks` field: each block has `subhead`, `paragraphs`, optional `pullQuote`. The 4 paragraphs were restructured into 3 subheaded blocks ("The old way", "What kept breaking", "What we do now") with the requested pull-quote ("Every plugin is also one more vendor that could touch your customer-facing surface.") between blocks 2 and 3. Brand-CSS adds `.content-section__subhead` and `.content-section__pullquote` styles.
- **#18 — Process page step callouts.** Added `yourTime` + `whatWeNeed` fields to each of the 6 steps in `pages/process/page.json`. Process template renders them as a 2-column callout row beneath each step's deliverable, separated by a dashed divider.
- **#20 — Drop strikethrough discount anchoring.** Brand-CSS hides `.pricing-price-was` (the strikethrough span) globally for jobsite-systems. The price now displays as a single clean monthly figure. Updated `pricing.json` `billing.yearlyNote` to "Annual billing — saves 30% vs. monthly." per spec.
- **#21 — Pricing toggle anchored above cards.** Brand-CSS pin re-positions `.pricing-float-rail` (formerly `right: 18rem` floating) to `top: 4.25rem; left: 50%; transform: translateX(-50%)` — horizontally centered above the price grid. Grid receives `margin-top: 5.25rem` to make room.

## Items deferred / partially landed

Each was deemed too invasive or too time-bound to land cleanly in this pass.
All are scoped enough that follow-up work is well-defined.

- **#4 — Nav dropdown a11y verification.** Read [Nav.astro:1580–1645](C:/Users/antho/arich-astro/src/builder/components/Nav.astro). Existing keyboard support: ✅ Tab to toggle, ✅ Enter/Space to open, ✅ Escape to close + return focus, ✅ Click-outside closes, ✅ `aria-expanded` updated, ✅ `aria-haspopup="true"`, ✅ Hover/focus-within open via CSS. **Missing**: arrow-key navigation between menu items inside an open panel. Ship-blocking? No — Tab still moves between items. **Caveat**: dropdown panel STYLING is gated on nav variant `G` per CSS at line 1311; jobsite-systems doesn't currently set a nav variant, so panels may render structurally but with limited visual treatment. Verify in the browser — if panels look wrong, add `"nav": "G"` to `site.json`'s page variants OR the brand's `defaultVariants`.
- **#12 — Convert services list (01–06) into 2x3 card grid.** The home Services section is driven by `serviceSlugs` and the `ServicesGrid.astro` component. Adding card variant would require a new component variant + Zod schema variant + brand-CSS rules. Out of scope for this pass; recommended next step.
- **#13 — Un-carousel the homepage "How it works".** ProcessSteps already auto-carousels in its current layout (visible in the rendered HTML). Conversion to static 3x2 is a component-level change to `ProcessSteps.astro` — defer.
- **#16 — About page comparison table.** Requires a new section type (`comparisonTable`) or a richer `aboutSplit` variant. The brand already has a `comparison-table` *addon* (per `site.json`) that's enabled — easiest path is to use it in About. Flagged as separate work.
- **#17 — Break up About "We stopped building on WordPress" wall-of-text.** Pure copy edit on `pages/about/sections/*.json`; needs the actual brand voice to land. Deferred to a copy pass.
- **#18 — Process page "Your time / What you provide" callouts.** Needs a new field on the `process` section schema + ProcessSteps render — small, isolated change but requires schema + component coordination.
- **#19 — Replace Services-page decorative photos with relevant visuals.** Asset-creation work; the brand-CSS append could ship icons, but the spec requests UI mockups (Lighthouse score, search result, etc.). Out of scope.
- **#20 — Remove pricing strikethrough + Yearly/Monthly toggle position (#21).** Pricing page uses a custom JSON shape + `[tier]/[cycle]` route. Both items need a focused pass on the pricing template; defer.
- **#22 — Service-specific testimonials.** Generic block dropped, TODO recorded; awaits owner-collected quotes.
- **#24 — Accessibility audit.** Major contrast and focus-state work was landed in the brand-CSS append. A full audit (axe-core or Wave) requires browser tooling not available here.
- **#25 — Performance / LCP measurement.** Build is clean and lazy-loading is already in place via Astro defaults; preload of hero images would need per-page additions to `Base.astro`. Recommend running a Lighthouse pass after deploy and dialing in from there.

---

## TODO list (machine-grep-able)

Search for `_TODO` in the JSON files (or `TODO:` in the Astro/CSS files):

```
arich-source/content/brands/jobsite-systems/pages/home/sections/01-hero.json:_TODO_copyApproval
arich-source/content/brands/jobsite-systems/pages/home/sections/01b1-trades-served.json:_TODO
arich-source/content/brands/jobsite-systems/pages/about/page.json:_TODO_testimonialsRemoved
arich-source/content/brands/jobsite-systems/pages/services/page.json:_TODO_serviceSpecificTestimonials
arich-source/content/brands/jobsite-systems/pages/pricing/page.json:_TODO_testimonialsScoped
arich-source/content/brands/jobsite-systems/testimonials.json:_TODO_attribution
```

---

## How to validate before deploy

```powershell
cd C:\Users\antho\arich-astro
$env:BRAND = "jobsite-systems"
npx astro check --noSync   # type / schema check
npx astro build            # full build → dist/
npx astro preview          # serve dist/ locally for visual QA
```

Visual QA hot spots:
- `/` — orange "Live in two weeks" section CTA contrast (#1)
- `/` — Trades-we-serve strip after the versus block (#11)
- `/` — FAQ "What if I want to cancel?" pre-expanded on first paint (#14)
- `/work/` — three centered cards with SVG mockups + demo-builds banner (#2)
- All interior pages — compressed page-header heroes (#5)
- Mobile (≤620px) — floating CTA renders as a 56px FAB (#6)
- Pricing nav link — bold + small dot, no permanent pill outline (#3)

## Screenshots

Cannot be produced from this environment without adding Playwright/Puppeteer
(spec disallows new dependencies). After running `astro preview`, capture:
- Homepage hero (above the fold)
- Work page cards row
- Pricing page
- "Live in two weeks" orange CTA section
