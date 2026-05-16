/**
 * Section registry — the single source of truth for the *mechanical* metadata
 * about each section: how its Zod literal, DOM kind, display label, component
 * filename, and doc filename relate.
 *
 * Field shapes still live in Zod (`src/content/config.ts` `pageSection`).
 * The registry just removes the duplication of identity strings across:
 *   - validate-brand.mjs   (KNOWN_SECTION_TYPES)
 *   - audit-sections.mjs   (component / doc existence + label parity)
 *   - render switches      (homepage + demo composition)
 *   - editor SECTION_KIND_COPY (later phase — needs build-time inlining)
 *
 * **Migration phase:** registered entries grow one or two at a time. The rest
 * of the union still works exactly as before — `audit-sections.mjs` falls
 * back to its existing checks for any type without a registry entry. Adding
 * an entry is purely additive: it surfaces drift between component and
 * registry without changing render behavior.
 *
 * **No dynamic component loading.** Astro's static analysis narrows
 * `section.type` only when render switches use literal strings. The registry
 * is consulted by *audit* code, not by runtime composition.
 */

export type SectionCategory =
  /** Composed via the `sections[]` discriminated union (homepage, demo pages). */
  | 'composition'
  /** Composition + inserted by `edit.js` as a builder primitive (designBreak, contentSection, statRibbon, photoGallery). */
  | 'builder-injected'
  /** Not in the union; composed by named keys on interior pages (SiteCta, NextSteps). */
  | 'interior';

export interface SectionRegistryEntry {
  /** Zod discriminator literal (camelCase). Empty string for `category: 'interior'` entries. */
  type: string;
  /** Kebab id used by `data-section-type` in the DOM. Editor's section-kind key. */
  kind: string;
  /** Human-readable label used by `data-section-label` and editor UI surfaces. */
  label: string;
  /** Component filename without extension under src/builder/components/sections/. */
  component: string;
  /** Doc filename without extension under src/builder/components/sections/. */
  docFile: string;
  /** Category. Drives downstream behavior: union membership, editor injection, etc. */
  category: SectionCategory;
}

export const SECTION_REGISTRY: readonly SectionRegistryEntry[] = [
  { type: 'hero',           kind: 'hero',            label: 'Hero',            component: 'Hero',           docFile: 'Hero',           category: 'composition' },
  { type: 'services',       kind: 'services',        label: 'Services',        component: 'ServicesGrid',   docFile: 'Services',       category: 'composition' },
  { type: 'work',           kind: 'work',            label: 'Work',            component: 'WorkGrid',       docFile: 'Work',           category: 'composition' },
  { type: 'why',            kind: 'why',             label: 'Why us',          component: 'Why',            docFile: 'Why',            category: 'composition' },
  { type: 'capabilities',   kind: 'capabilities',    label: 'Capabilities',    component: 'Capabilities',   docFile: 'Capabilities',   category: 'composition' },
  { type: 'testimonials',   kind: 'testimonials',    label: 'Testimonials',    component: 'Testimonials',   docFile: 'Testimonials',   category: 'composition' },
  { type: 'process',        kind: 'process',         label: 'Process',         component: 'ProcessSteps',   docFile: 'Process',        category: 'composition' },
  { type: 'partnership',    kind: 'partnership',     label: 'Partnership',     component: 'Partnership',    docFile: 'Partnership',    category: 'composition' },
  { type: 'faq',            kind: 'faq',             label: 'FAQ',             component: 'FAQ',            docFile: 'Faq',            category: 'composition' },
  { type: 'historyTeaser',  kind: 'history-teaser',  label: 'History teaser',  component: 'HistoryTeaser',  docFile: 'HistoryTeaser',  category: 'composition' },
  { type: 'designBreak',    kind: 'design-break',    label: 'Design break',    component: 'DesignBreak',    docFile: 'DesignBreak',    category: 'builder-injected' },
  { type: 'aboutSplit',     kind: 'about-split',     label: 'About split',     component: 'AboutSplit',     docFile: 'AboutSplit',     category: 'composition' },
  { type: 'contentSection', kind: 'content-section', label: 'Content section', component: 'ContentSection', docFile: 'ContentSection', category: 'builder-injected' },
  { type: 'statRibbon',     kind: 'stat-ribbon',     label: 'Stat ribbon',     component: 'StatRibbon',     docFile: 'StatRibbon',     category: 'builder-injected' },
  { type: 'photoGallery',   kind: 'photo-gallery',   label: 'Photo gallery',   component: 'PhotoGallery',   docFile: 'PhotoGallery',   category: 'builder-injected' },
  { type: 'photoSlider',    kind: 'photo-slider',    label: 'Photo slider',    component: 'PhotoSlider',    docFile: 'PhotoSlider',    category: 'composition' },
  { type: 'versusBlock',    kind: 'versus-block',    label: 'Versus block',    component: 'VersusBlock',    docFile: 'VersusBlock',    category: 'composition' },
  { type: 'trustBand',      kind: 'trust-band',      label: 'Trust band',      component: 'TrustBand',      docFile: 'TrustBand',      category: 'composition' },
  { type: 'finalCta',       kind: 'cta',             label: 'Final CTA',       component: 'FinalCta',       docFile: 'FinalCta',       category: 'composition' },
  { type: 'divider',        kind: 'divider',         label: 'Divider',         component: 'Divider',        docFile: 'Divider',        category: 'builder-injected' },
  /* Pass 4 — blog homepage primitives (currently swift-digest only). */
  { type: 'latestPosts',    kind: 'latest-posts',    label: 'Latest posts',    component: 'LatestPosts',    docFile: 'LatestPosts',    category: 'composition' },
  { type: 'categoryLinks',  kind: 'category-links',  label: 'Category links',  component: 'CategoryLinks',  docFile: 'CategoryLinks',  category: 'composition' },
  { type: 'tagCloud',       kind: 'tag-cloud',       label: 'Tag cloud',       component: 'TagCloudSection',docFile: 'TagCloud',       category: 'composition' },
  { type: 'aboutStrip',     kind: 'about-strip',     label: 'About strip',     component: 'AboutStrip',     docFile: 'AboutStrip',     category: 'composition' },
  { type: 'newsroomHero',   kind: 'newsroom-hero',   label: 'Newsroom hero',   component: 'NewsroomHero',   docFile: 'NewsroomHero',   category: 'composition' },
  { type: 'homeArchive',    kind: 'home-archive',    label: 'Home archive',    component: 'HomeArchive',    docFile: 'HomeArchive',    category: 'composition' },
];

/** Zod literals registered (excludes `category: 'interior'` entries with no `type`). */
export const SECTION_TYPES: readonly string[] = SECTION_REGISTRY
  .filter((e) => e.type)
  .map((e) => e.type);

/** Single entry by Zod type. Returns undefined for unregistered types (currently the two `category: 'interior'` components — SiteCta + NextSteps — that have no Zod literal). */
export function bySectionType(type: string): SectionRegistryEntry | undefined {
  return SECTION_REGISTRY.find((e) => e.type === type);
}

/**
 * Entries by DOM kind. Returns an array because `cta` is shared by FinalCta + SiteCta;
 * the registry must not pretend `kind` is a unique key.
 */
export function bySectionKind(kind: string): SectionRegistryEntry[] {
  return SECTION_REGISTRY.filter((e) => e.kind === kind);
}
