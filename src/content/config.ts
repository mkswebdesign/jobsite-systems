import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pageFolderLoader } from './page-folder-loader';
import { demoFolderLoader } from './demo-folder-loader';
import { testimonialsLoader } from './testimonials-loader';

const BRAND_ID = process.env.BRAND || 'arich';
const _arichRel = existsSync(join(process.cwd(), 'arich-source')) ? '.' : '..';
const CONTENT = `${_arichRel}/arich-source/content/brands/${BRAND_ID}`;

/* Resolve a content path against the project root for existence checks.
 * config.ts runs from the project root at build time. */
const CONTENT_FS = join(process.cwd(), _arichRel, 'arich-source', 'content', 'brands', BRAND_ID);

/** Empty-collection loader — returned when a JSON source file is missing for
 *  the active brand, so brands without a posts collection don't crash on
 *  categories.json/authors.json reads. The `glob` loader handles missing
 *  directories gracefully on its own. */
const emptyLoader = (name: string) => ({ name, load: async () => {} });

const cta = z.object({ label: z.string(), href: z.string() });

const seo = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  canonical: z.string().optional(),
  schemaName: z.string().optional(),
  schemaDescription: z.string().optional(),
});

/* ---------- Homepage / page section discriminated union ---------- */

const heroSection = z.object({
  type: z.literal('hero'),
  /** DOM id override. Lets a page render multiple Hero sections without
   *  duplicate-id collisions (default "hero" still applies when omitted). */
  id: z.string().optional(),
  badge: z.string().optional(),
  badgeHref: z.string().optional(),
  headline: z.string(),
  headlineAccent: z.string().optional(),
  lead: z.string(),
  metaLabel: z.string().optional(),
  metaParts: z.array(z.string()).optional(),
  ctaPrimary: cta.optional(),
  ctaSecondary: cta.optional(),
  backgroundImages: z.array(z.string()).optional(),
  backgroundImageInterval: z.number().positive().optional(),
  trustMetrics: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  trustMarquee: z.boolean().optional(),
  imageCaption: z.string().optional(),
  /** Per-slide labels rendered in the variant-E Spotlight slider's caption pill
   *  (one per `backgroundImages` entry; the active slide's label appears next
   *  to the accent dot). When omitted, the static `imageCaption` is shown for
   *  every slide. */
  slideCaptions: z.array(z.string()).optional(),
  /** Editorial corner mark for variant E (top-left rule + tracked text, e.g.
   *  "— BRAND NAME — EST. 2014"). When omitted, derived from brand.name +
   *  the year parsed from `metaParts` ("Since YYYY" pattern). */
  editorialMark: z.string().optional(),
  variant: z.string().optional(),
});

const servicesSection = z.object({
  type: z.literal('services'),
  sectionLabel: z.string(),
  heading: z.string(),
  subtext: z.string().optional(),
  serviceSlugs: z.array(z.string()),
});

const workSection = z.object({
  type: z.literal('work'),
  sectionLabel: z.string(),
  heading: z.string(),
  subtext: z.string().optional(),
  workSlugs: z.array(z.string()),
  viewAllLabel: z.string().optional(),
  viewAllHref: z.string().optional(),
});

const whyCard = z.object({
  iconKey: z.string(),
  title: z.string(),
  body: z.string(),
  cta: z.object({ label: z.string(), href: z.string() }).optional(),
});

const whySection = z.object({
  type: z.literal('why'),
  sectionLabel: z.string(),
  heading: z.string(),
  subtext: z.string().optional(),
  cards: z.array(whyCard),
  variant: z.string().optional(),
});

const capabilitiesSection = z.object({
  type: z.literal('capabilities'),
  sectionLabel: z.string(),
  heading: z.string(),
  subtext: z.string().optional(),
  useSkillsCarousel: z.boolean().default(true),
  /** Primary surface for the capabilities section. Default `carousel` keeps
   *  the looping skill-chip rows + click-to-open modal. `grouped` renders the
   *  same group titles / bodies / chips as the section's primary content —
   *  better when the capability inventory is the substance, not a teaser. */
  layout: z.enum(['carousel', 'grouped']).optional(),
});

const testimonialsItem = z.object({
  quote: z.string(),
  authorName: z.string(),
  authorRole: z.string().optional(),
  authorInitials: z.string().optional(),
  avatar: z.string().optional(),
});

const testimonialsSection = z.object({
  type: z.literal('testimonials'),
  sectionLabel: z.string(),
  heading: z.string(),
  subtext: z.string().optional(),
  /** Omit or leave empty to auto-include all testimonials where `featured: true`. */
  testimonialIds: z.array(z.string()).optional(),
  /** Inline items — bypasses the testimonials content collection. Useful for
   *  demo pages or bespoke one-off copy that shouldn't pollute the brand-wide
   *  testimonials.json. Takes precedence over testimonialIds when present. */
  items: z.array(testimonialsItem).optional(),
  variant: z.enum(['grid', 'carousel', 'slider']).default('grid'),
});

const processStep = z.object({
  number: z.string(),
  title: z.string(),
  body: z.string(),
});

const processSection = z.object({
  type: z.literal('process'),
  sectionLabel: z.string(),
  heading: z.string(),
  subtext: z.string().optional(),
  steps: z.array(processStep),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
});

const partnershipSection = z.object({
  type: z.literal('partnership'),
  sectionLabel: z.string(),
  heading: z.string(),
  subtext: z.string().optional(),
  cardTitle: z.string(),
  cardLead: z.string(),
  benefits: z.array(z.string()),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  note: z.string().optional(),
});

const faqSection = z.object({
  type: z.literal('faq'),
  sectionLabel: z.string(),
  heading: z.string(),
  subtext: z.string().optional(),
  faqIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  /** When true, the first FAQ item renders pre-expanded so the highest-intent
   *  question's answer is visible without a click. Default: false. */
  openFirst: z.boolean().optional(),
  /** Specific FAQ ids to render pre-expanded. Use when the question to surface
   *  isn't first in the list (e.g. expand "What if I want to cancel?" by
   *  default while keeping it in its narrative position). */
  openIds: z.array(z.string()).optional(),
});

const finalCtaSection = z.object({
  type: z.literal('finalCta'),
  heading: z.string(),
  body: z.string(),
  ctaPrimary: cta,
  ctaSecondary: cta.optional(),
  headshot: z.string().nullable().optional(),
});

/** Homepage band linking to /best/ (per-year club picks, best.futbol). */
const historyTeaserSection = z.object({
  type: z.literal('historyTeaser'),
  sectionLabel: z.string().optional(),
  heading: z.string(),
  subtext: z.string().optional(),
  cta: cta,
});

/** Visual breather band with a background and a simple CTA — used to break up long pages between content-heavy sections.
 *  Variant D (Spotlight) additionally renders a 2x2 stats panel and an optional secondary link
 *  alongside the primary CTA; both fields are ignored by variants A/B/C.
 *  Variant E (Process) renders an inline numbered process list (`steps`) in the copy column
 *  alongside the same 2x2 stats panel; ignored by variants A/B/C/D. */
const designBreakSection = z.object({
  type: z.literal('designBreak'),
  sectionLabel: z.string().optional(),
  heading: z.string(),
  /** Optional HTML-bearing heading (variant J only). When set, renders via
   *  set:html so authors can wrap accent words in <span class="accent">.
   *  Plain `heading` stays the SEO/fallback source of truth. */
  headingHtml: z.string().optional(),
  subtext: z.string().optional(),
  backgroundImage: z.string().optional(),
  cta: cta,
  /** Optional second action shown to the right of the primary CTA. Variant D only. */
  secondaryCta: cta.optional(),
  /** 2x2 stats panel content for variants D, E, J. Capped at 4; extras ignored. Falls back to component defaults when omitted.
   *  `category` is an uppercase tag rendered above the value (variant J only).
   *  `unit` is a smaller suffix appended to the value (variant J only — e.g. value "<1" + unit "s"). */
  stats: z.array(z.object({
    value: z.string(),
    label: z.string(),
    category: z.string().optional(),
    unit: z.string().optional(),
  })).max(4).optional(),
  /** Variant J only: 3-item trust row rendered between CTAs and the stats card. */
  trustItems: z.array(z.string()).max(6).optional(),
  /** Variant J only: footer text inside the stats card. `left` is plain text;
   *  `right` is rendered alongside a pulsing status dot. */
  statsFooter: z.object({ left: z.string(), right: z.string() }).optional(),
  /** Numbered process steps shown in the copy column for variant E. 3-6 entries.
   *  `proof` is an optional inline metric chip rendered under the step body
   *  (used by landscape-systems variant C to anchor a stat to the step it
   *  belongs to; ignored by variants whose CSS doesn't surface it).
   *  `chip` is a single-string proof-point chip surfaced by variant I
   *  (Field-Notes); ignored by other variants and supersedes `proof` under I. */
  steps: z.array(z.object({
    number: z.string(),
    title: z.string(),
    body: z.string().optional(),
    proof: z.object({ value: z.string(), label: z.string() }).optional(),
    chip: z.string().optional(),
  })).min(3).max(6).optional(),
  /** Optional credential pill (e.g. "10 yrs in the Flint Hills") rendered in
   *  the section's heading row. Only surfaced by variants whose brand CSS
   *  styles `.design-break__credential`; absent in the default scaffolding. */
  credential: z.object({ value: z.string(), label: z.string() }).optional(),
  /** Optional muted footer note rendered next to the CTA in the actions row.
   *  Only surfaced by variants whose brand CSS styles `.design-break__footer-note`. */
  footerNote: z.string().optional(),
  variant: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']).optional(),
});

/** AboutSplit — image-on-one-side / prose-on-the-other intro block.
 *  Pairs a single feature image with 1-3 paragraphs of prose. Use as
 *  a homepage about-teaser, a story-of-the-business band, or wherever
 *  one image plus copy needs to land together. Distinct from designBreak
 *  (atmospheric, full-bleed BG) and contentSection (text-only).
 *  Variants:
 *    A · Default   — image left, text right (standard)
 *    B · Reversed  — image right, text left (alternates rhythm)
 *    C · Compact   — smaller image, single paragraph */
const aboutSplitSection = z.object({
  type: z.literal('aboutSplit'),
  sectionLabel: z.string().optional(),
  heading: z.string(),
  body: z.union([z.string(), z.array(z.string())]),
  image: z.string(),
  imageAlt: z.string().optional(),
  cta: cta,
  variant: z.enum(['A', 'B', 'C']).optional(),
  // Optional rotating media deck. When present, the static `image` is
  // replaced with an auto-cycling stack of clickable frames — each
  // frame links out to the listed work site or in to a service page.
  // Frames fade-cross every ~4.5s with hover-pause + dot navigation.
  cycle: z.array(z.object({
    src: z.string(),
    alt: z.string().optional(),
    href: z.string(),
    label: z.string().optional(),
    meta: z.string().optional(),
    urlLabel: z.string().optional(),
  })).min(2).max(24).optional(),
});

/** Editorial content block — text-only, no images. The agent uses this
 *  for prose, essays, case studies, explainers. Body accepts a single
 *  string or an array of strings (one paragraph each) so authors can
 *  write 1-4 paragraphs without HTML. Brand-styled variants:
 *    A · Standard  — single column, left-aligned with accent rule
 *    B · Centered  — narrow centered column, larger heading
 *    C · Editorial — magazine-style two-column text (heading left,
 *                    body right) — no images, just typography
 *    D · Spotlight — vibrant accent-tinted head card + drop cap +
 *                    animated entry, accent rule, halo drift, dot pulse,
 *                    and CTA sweep. Theme-aware (vibrant/dark/bright)
 *                    and respects prefers-reduced-motion. */
const contentSectionSection = z.object({
  type: z.literal('contentSection'),
  sectionLabel: z.string().optional(),
  heading: z.string(),
  body: z.union([z.string(), z.array(z.string())]),
  cta: cta.optional(),
  variant: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  /* Stage-only (variant E): two-column build comparison, italic
     statement tail, and an uppercase rail meta line. Optional
     everywhere — Stage falls back to a plain Standard layout when
     these are absent, and A/B/C/D ignore them entirely. */
  indexNum: z.string().optional(),
  comparison: z.object({
    left: z.object({
      tag: z.string(),
      num: z.string(),
      unit: z.string(),
      items: z.array(z.string()).min(1).max(8),
    }),
    right: z.object({
      tag: z.string(),
      num: z.string(),
      unit: z.string(),
      items: z.array(z.string()).min(1).max(8),
      accent: z.boolean().optional(),
    }),
  }).optional(),
  statementTag: z.string().optional(),
  railMeta: z.string().optional(),
});

/* StatRibbon — third editor-injected primitive. A horizontal strip of
 *  proof points (number + label, optional sublabel). Use for measurable
 *  substance — years in business, projects shipped, plugins required.
 *  Distinct from designBreak (atmospheric) and contentSection (prose).
 *  1-6 stat items required; heading + sectionLabel + cta optional.
 *  Variants:
 *    A · Compact  — single horizontal row, modest sizing
 *    B · Display  — oversized numbers, more vertical breathing room
 *    C · Bordered — bordered grid cells, 2-up mobile / 4-up desktop */
const statRibbonSection = z.object({
  type: z.literal('statRibbon'),
  sectionLabel: z.string().optional(),
  heading: z.string().optional(),
  stats: z.array(z.object({
    value: z.string(),
    label: z.string(),
    sublabel: z.string().optional(),
  })).min(1).max(6),
  cta: cta.optional(),
  variant: z.enum(['A', 'B', 'C']).optional(),
});

/** VersusBlock — head-to-head comparison band. Two columns of paired
 *  statements: the way most operators do it (left, dampened) versus the
 *  way the brand does it (right, accent + checkmarks). Each row is the
 *  same point cast both ways, so the contrast carries the argument
 *  without needing prose. Use as a positioning beat near the top of a
 *  page where the brand's differentiation IS the story.
 *  2-8 paired rows; heading required; sectionLabel/subtext/cta optional.
 *  Variants:
 *    A · Standard — side-by-side columns with a "vs." divider (default)
 *    B · Stacked  — left column above right column with mobile-first
 *                   rhythm; reads as a flip-card on wider screens */
const versusBlockSection = z.object({
  type: z.literal('versusBlock'),
  sectionLabel: z.string().optional(),
  heading: z.string(),
  subtext: z.string().optional(),
  leftLabel: z.string(),
  rightLabel: z.string(),
  rows: z.array(z.object({
    left: z.string(),
    right: z.string(),
  })).min(2).max(8),
  cta: cta.optional(),
  variant: z.enum(['A', 'B']).optional(),
});

/** PhotoGallery — multi-image showcase block. For project work, before/
 *  after photos, team shots, equipment galleries. Distinct from designBreak
 *  (single atmospheric image) and contentSection (text-only).
 *  3-12 image items required (each: { src, alt?, caption? }).
 *  Heading + sectionLabel + subtext + CTA all optional.
 *  Variants:
 *    A · Grid     — uniform aspect-ratio grid (default; 3-up tablet, 4-up desktop)
 *    B · Masonry  — varied heights via CSS columns (mixed-orientation photos)
 *    C · Carousel — horizontal scroll-snap strip (best for 6+ photos) */
const photoGallerySection = z.object({
  type: z.literal('photoGallery'),
  sectionLabel: z.string().optional(),
  heading: z.string().optional(),
  subtext: z.string().optional(),
  images: z.array(z.object({
    src: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
  })).min(2).max(48),
  cta: cta.optional(),
  variant: z.enum(['A', 'B', 'C']).optional(),
  perPage: z.number().int().min(1).max(24).optional(),
});

/** Divider — decorative bordered horizontal rule between two authored
 *  sections. Editor-injected via the gomks builder's divider-gap button.
 *  Pure decoration; never carries semantic content. The `color` choice
 *  resolves through the brand's theme tokens at render time so the line
 *  stays visible across vibrant / dark / light modes. */
const dividerSection = z.object({
  type: z.literal('divider'),
  color: z.enum(['dark', 'light', 'primary', 'secondary']).optional(),
});

/** PhotoSlider — auto-advancing photo slider.
 *  Variants:
 *    A · Default            — single visible slide, fade transition, dots + arrows
 *    B · Carousel           — continuous-scroll marquee, multi-visible, hover-to-
 *                             pause, click slide → lightbox
 *    C · Carousel Slim      — same as B but with section padding 1px + margin 0,
 *                             for ultra-thin marquee strips between sections
 *    D · Carousel Slim Full — same as C (slim) but the inner container breaks
 *                             out to full viewport width — edge-to-edge marquee
 *                             that ignores the brand max-width gutter */
const photoSliderSection = z.object({
  type: z.literal('photoSlider'),
  sectionLabel: z.string().optional(),
  heading: z.string().optional(),
  subtext: z.string().optional(),
  images: z.array(z.object({
    src: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
  })).min(2).max(48),
  cta: cta.optional(),
  variant: z.enum(['A', 'B', 'C', 'D']).optional(),
  autoplay: z.boolean().optional(),
  interval: z.number().int().min(1500).max(20000).optional(),
  shuffle: z.boolean().optional(),
});

/** TrustBand inline section — when authored as a page section, the items/cta
 *  arrays override the brand-level brand.json `trustBand` defaults for that
 *  one render. Used by jobsite-systems' homepage as the "Trades we serve"
 *  strip slot; usable by any brand as a generic icon+text strip. */
const trustBandSection = z.object({
  type: z.literal('trustBand'),
  items: z.array(z.object({
    iconKey: z.string(),
    text: z.string(),
    href: z.string().optional(),
  })).min(1),
  cta: cta.optional(),
}).passthrough();

/* === Blog homepage sections (Pass 4) ===
 * Used by swift-digest's home.json after the cutover. Sibling brands don't
 * reference these types, so they're inert for the agency template. */

const latestPostsSection = z.object({
  type: z.literal('latestPosts'),
  eyebrow: z.string().optional(),
  heading: z.string(),
  subhead: z.string().optional(),
  limit: z.number().int().min(1).max(24).default(6),
  viewAll: cta.optional(),
});

const categoryLinksSection = z.object({
  type: z.literal('categoryLinks'),
  eyebrow: z.string().optional(),
  heading: z.string(),
  subhead: z.string().optional(),
});

const tagCloudSection = z.object({
  type: z.literal('tagCloud'),
  eyebrow: z.string().optional(),
  heading: z.string(),
  limit: z.number().int().min(1).max(50).default(20),
});

const aboutStripSection = z.object({
  type: z.literal('aboutStrip'),
  heading: z.string(),
  body: z.string(),
  cta: cta.optional(),
});

/* Home archive — embeds the full /archive/ filtering UI inline below
 * the homepage hero. Composes the existing ArchiveToolbar +
 * ArchiveList + ArchiveDrawer trio, capped at a top-N feature set
 * with a "View the full archive →" CTA preserving any drawer-active
 * querystring. The toolbar JS recognizes the section root via its
 * `.home-archive` class (additive selector — sibling brands without
 * `.home-archive` on any page are unaffected). The data-result-limit
 * attribute on the root opts the toolbar JS into top-N capping +
 * truncation CTA behavior. Swift-digest only today. */
const homeArchiveSection = z.object({
  type: z.literal('homeArchive'),
  eyebrow: z.string().optional(),
  heading: z.string(),
  subhead: z.string().optional(),
  limit: z.number().int().min(3).max(24).default(12),
  viewAll: z.object({
    label: z.string().default('View the full archive'),
    href: z.string().default('/archive/'),
  }).optional(),
  variant: z.string().optional(),
});

/* Newsroom hero — content-forward homepage hero for blog brands.
 * Surfaces real post data above the fold (status bar with build-time
 * date + headline ticker, beat-nav pills sourced from categories.json,
 * featured top story card, two secondary stories, newsletter slot).
 * Currently swift-digest only; replaces a generic `hero` section in
 * the JSON. Falls back gracefully when posts collection is empty. */
const newsroomHeroSection = z.object({
  type: z.literal('newsroomHero'),
  id: z.string().optional(),
  headline: z.string(),
  headlineAccent: z.string().optional(),
  lead: z.string(),
  liveLabel: z.string().default('LIVE NEWSROOM'),
  tickerLimit: z.number().int().min(3).max(24).default(12),
  newsletter: z.object({
    heading: z.string().default('The Daily Digest'),
    body: z.string().default('Top stories in your inbox each morning.'),
    cta: z.object({ label: z.string(), href: z.string() }),
  }).optional(),
  variant: z.string().optional(),
});

const pageSection = z.discriminatedUnion('type', [
  heroSection,
  servicesSection,
  workSection,
  whySection,
  capabilitiesSection,
  testimonialsSection,
  processSection,
  partnershipSection,
  faqSection,
  historyTeaserSection,
  designBreakSection,
  aboutSplitSection,
  contentSectionSection,
  statRibbonSection,
  photoGallerySection,
  photoSliderSection,
  versusBlockSection,
  trustBandSection,
  finalCtaSection,
  dividerSection,
  latestPostsSection,
  categoryLinksSection,
  tagCloudSection,
  aboutStripSection,
  newsroomHeroSection,
  homeArchiveSection,
]);

/* ---------- Collections ---------- */

/**
 * Shared testimonials block for interior pages (about/services/pricing/work/contact).
 * Homepage uses the full `testimonialsSection` via the `sections` composition array;
 * interior pages currently use named keys, so they just opt in via this top-level field.
 */
const pageTestimonialsBlock = z.object({
  sectionLabel: z.string().default('Client Feedback'),
  heading: z.string().default('In their own words.'),
  subtext: z.string().optional(),
  testimonialIds: z.array(z.string()).optional(),
  variant: z.enum(['grid', 'carousel']).default('carousel'),
});

/* Per-page variant overrides. Map of section-type slug → variant value
 *  (single letter A-H or kebab slug). Merged on top of `brand.defaultVariants`
 *  by Base.astro so an override here only affects this page render — siblings
 *  and demos are untouched. Visitor localStorage still wins on top. */
const pageVariants = z.record(z.string()).optional();

const pages = defineCollection({
  loader: pageFolderLoader(`${CONTENT}/pages`),
  schema: z.object({
    slug: z.string(),
    path: z.string(),
    seo: seo,
    sections: z.array(pageSection).optional(),
    testimonials: pageTestimonialsBlock.optional(),
    variants: pageVariants,
  }).passthrough(),
});

/* Hidden demo pages — `/demo/<demo>/<slug>/` URLs. Same schema as `pages`,
 *  loaded from a parallel content tree (demos/<demo>/pages/) so a demo can
 *  diverge from production without affecting the live brand. Demo routes
 *  live at src/pages/demo/[demo]/[...slug].astro and are noindex'd plus
 *  excluded from the sitemap + robots.txt. */
const demoPages = defineCollection({
  loader: demoFolderLoader(`${CONTENT}/demos`),
  schema: z.object({
    slug: z.string(),
    path: z.string(),
    seo: seo,
    sections: z.array(pageSection).optional(),
    testimonials: pageTestimonialsBlock.optional(),
    variants: pageVariants,
  }).passthrough(),
});

const services = defineCollection({
  loader: glob({ pattern: '*.json', base: `${CONTENT}/services` }),
  schema: z.object({
    slug: z.string(),
    order: z.number(),
    number: z.string(),
    iconKey: z.string().optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    title: z.string(),
    headline: z.string(),
    shortDescription: z.string(),
    lead: z.string().optional(),
    seo: seo.optional(),
    sections: z.array(z.any()).optional(),
    cta: z.object({
      heading: z.string(),
      body: z.string(),
      label: z.string(),
      href: z.string(),
    }).optional(),
  }).passthrough(),
});

const work = defineCollection({
  loader: glob({ pattern: '*.json', base: `${CONTENT}/work` }),
  schema: z.object({
    slug: z.string(),
    order: z.number(),
    title: z.string(),
    shortTitle: z.string().optional(),
    headline: z.string().optional(),
    client: z.string().optional(),
    cardSummary: z.string(),
    lead: z.string().optional(),
    category: z.string().optional(),
    projectMeta: z.string().optional(),
    tags: z.array(z.string()).default([]),
    gradientPreset: z.enum(['g1', 'g2', 'g3', 'g4', 'g5', 'g6']),
    timelineWeeks: z.number().optional(),
    timelineLabel: z.string().optional(),
    liveUrl: z.string().optional(),
    liveUrlLabel: z.string().optional(),
    image: z.string().nullable().optional(),
    imageAlt: z.string().nullable().optional(),
    seo: seo.optional(),
    metrics: z.array(z.object({
      value: z.string(),
      label: z.string(),
      barWidth: z.string().optional(),
    })).optional(),
    challenge: z.string().optional(),
    solution: z.object({
      intro: z.string(),
      items: z.array(z.string()),
    }).optional(),
    technologies: z.array(z.string()).optional(),
    keyFeatures: z.array(z.string()).optional(),
    results: z.string().optional(),
    testimonial: z.object({
      quote: z.string(),
      authorName: z.string(),
      authorRole: z.string(),
      authorInitials: z.string().optional(),
    }).optional(),
    relatedServices: z.array(z.string()).optional(),
  }).passthrough(),
});

/* Testimonials are loaded from BOTH the main-brand testimonials.json AND
 * each demo's own testimonials.json (with demo entries namespaced as
 * `demos/<demo>/<id>` so the main-brand homepage's `featured: true`
 * fallback can exclude them). The demo catch-all route prefixes any
 * `testimonialIds` reference at render time so demo authors keep using
 * natural ids. See src/content/testimonials-loader.ts. */
const testimonials = defineCollection({
  loader: testimonialsLoader(CONTENT),
  schema: z.object({
    id: z.string(),
    quote: z.string(),
    authorName: z.string(),
    authorRole: z.string(),
    authorInitials: z.string().optional(),
    avatar: z.string().url().optional(),
    relatedWork: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

/** One file per year (e.g. `2014.json`) — that season’s world #1 side at `/best/{year}/{slug}/`. */
const bestByYear = defineCollection({
  loader: glob({
    pattern: '*.json',
    base: `${CONTENT}/best-by-year`,
    /* Default glob id is `data.slug`, so duplicate slugs (e.g. many years of real-madrid) collapsed. */
    generateId: ({ entry }) => {
      const file = entry.split('/').pop() ?? entry;
      return file.replace(/\.json$/i, '');
    },
  }),
  schema: z.object({
    year: z.number().int().min(2000).max(2025),
    slug: z.string(),
    name: z.string(),
    shortName: z.string().optional(),
    country: z.string().optional(),
    cardSummary: z.string(),
    intro: z.string(),
    highlights: z.array(z.string()),
    achievements: z.array(z.string()).default([]),
    gradientPreset: z.enum(['g1', 'g2', 'g3', 'g4', 'g5', 'g6']).default('g1'),
    tags: z.array(z.string()).default([]),
    seo: seo.optional(),
  }).passthrough(),
});

/* ---------- Blog collections (Pass 2) ----------
 * Posts/categories/authors are scoped to brands that authored them. Brands
 * without a `posts/` directory get an empty `posts` collection (glob handles
 * this); brands without `categories.json` / `authors.json` get an
 * empty-loader stub so the build doesn't crash on a missing file. */

const postCover = z.object({
  src: z.string(),
  alt: z.string(),
  credit: z.string().optional(),
});

const postSeo = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  noindex: z.boolean().default(false),
});

const posts = defineCollection({
  loader: glob({ pattern: '*.md', base: `${CONTENT}/posts` }),
  schema: z.object({
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** Optional drip-publish gate: when set to a future ISO timestamp, the
     *  post is hidden from /archive/, /category/, /tag/, /post/<slug>/,
     *  /rss.xml, /search.json, and the sitemap until the build runs after
     *  this moment. Authors who want immediate publish leave it empty.
     *  Pair with a scheduled `npm run ship` (cron / scheduled remote agent)
     *  so each rebuild surfaces any newly-due posts. */
    publishAt: z.coerce.date().optional(),
    status: z.enum(['draft', 'published', 'archived']),
    featured: z.boolean().default(false),
    author: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    excerpt: z.string().max(200),
    cover: postCover,
    toc: z.boolean().default(false),
    seo: postSeo.default({}),
  }),
});

const categoriesPath = `${CONTENT_FS}/categories.json`;
const categories = defineCollection({
  loader: existsSync(categoriesPath)
    ? file(`${CONTENT}/categories.json`, { parser: (text) => JSON.parse(text).categories })
    : emptyLoader('categories-empty'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    color: z.string().optional(),
    order: z.number().int(),
  }),
});

const authorsPath = `${CONTENT_FS}/authors.json`;
const authors = defineCollection({
  loader: existsSync(authorsPath)
    ? file(`${CONTENT}/authors.json`, { parser: (text) => JSON.parse(text).authors })
    : emptyLoader('authors-empty'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    links: z.record(z.string()).optional(),
  }),
});

export const collections = { pages, demoPages, services, work, testimonials, bestByYear, posts, categories, authors };
