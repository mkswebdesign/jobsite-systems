import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Resolve from the project root (where `npm run build` runs) — robust across
// source tree moves and Vite's bundling into dist/chunks/.
const CONTENT_ROOT = existsSync(join(process.cwd(), 'arich-source'))
  ? join(process.cwd(), 'arich-source', 'content')
  : join(process.cwd(), '..', 'arich-source', 'content');

export const BRAND_ID: string = process.env.BRAND || 'arich';
const BRAND_ROOT = join(CONTENT_ROOT, 'brands', BRAND_ID);
export const BRAND_ROOT_DIR = BRAND_ROOT;

export interface BrandColors {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgCardHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentRgb: string;
  accentHover: string;
  accentHoverRgb: string;
  border: string;
  borderLight: string;
}

export interface Brand {
  id: string;
  name: string;
  nameParts?: { prefix: string; accent: string };
  tagline: string;
  description: string;
  domain: string;
  url: string;
  locale: string;
  copyrightYear: number;
  owner: {
    name: string;
    role: string;
    experienceYears: number;
    linkedin?: string | null;
    headshot: string;
  };
  contact: {
    email: string;
    emailAlt?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  social: Record<string, string | null>;
  theme: {
    mode: string;
    colors: BrandColors;
    lightColors?: BrandColors;
    typography: {
      fontFamily: string;
      fontUrl: string;
      fontUrlExtended?: string;
      fallbacks: string;
    };
    radius: { base: string; lg: string };
    maxWidth: string;
    // All sections below are OPTIONAL — brands that don't declare them
    // inherit the hard-coded fallbacks in brandCssVars(). Each one tokenizes
    // a global design decision so the in-page editor's Theme → Design
    // Options tab exposes them as editable knobs (see
    // scripts/build-theme-index.mjs for the generator).
    borders?: { thin?: string; medium?: string; thick?: string };
    spacing?: { xs?: string; sm?: string; md?: string; lg?: string; xl?: string; '2xl'?: string };
    shadows?: { sm?: string; md?: string; lg?: string; xl?: string };
    motion?: {
      durationFast?: string;
      durationBase?: string;
      durationSlow?: string;
      easingStandard?: string;
      easingAccent?: string;
    };
    buttons?: {
      radius?: string;
      paddingX?: string;
      paddingY?: string;
      fontWeight?: string;
      letterSpacing?: string;
      textTransform?: string;
      borderWidth?: string;
    };
  };
  assets: Record<string, string | null>;
  seo: {
    defaultTitleSuffix: string;
    defaultDescription: string;
    twitterCard: string;
    ogType: string;
    schemaOrganization: Record<string, string>;
  };
  analytics: Record<string, string | null>;
  /** Editor access. Optional: if omitted, the bootstrap falls back to its hardcoded defaults for backwards compat. */
  editor?: {
    /** IPs that auto-activate the in-page editor on visit. Everyone else still gets the keyboard-chord + ?edit=force escape hatches. */
    allowlist?: string[];
  };
  /** Site-wide default variants (e.g. `{ hero: "B" }`). Applied to <html data-<name>-variant> before first paint; any per-visitor localStorage choice still wins over the default. */
  defaultVariants?: Record<string, string>;
  /** Optional per-brand label overrides for the work-detail template
   *  ([src/pages/work/[slug].astro]). Defaults preserve agency-template English
   *  ("Case Study" / "Client" / "Technologies Used" / "Start Your Site" / etc.).
   *  Brands like a kennel override these so the same template reads as
   *  "Our Dogs" / "Role" / "Health Clearances" / etc. without any per-brand
   *  template fork. Per-record overrides on a work entry can layer on top. */
  workTerms?: Partial<{
    indexBreadcrumb: string;
    indexBreadcrumbHref: string;
    sectionLabelDefault: string;
    metaClientLabel: string;
    metaCategoryLabel: string;
    metaTimelineLabel: string;
    metaTimelineUnit: string;
    metaTagsLabel: string;
    challengeLabel: string;
    challengeHeading: string;
    solutionLabel: string;
    solutionHeading: string;
    technologiesHeading: string;
    keyFeaturesHeading: string;
    resultsLabel: string;
    resultsHeading: string;
    relatedServicesLabel: string;
    relatedServicesHeading: string;
    relatedServicesSubtext: string;
    ctaHeading: string;
    ctaBody: string;
    ctaPrimaryLabel: string;
    ctaPrimaryHref: string;
    ctaSecondaryLabel: string;
    ctaSecondaryHref: string;
    pagerPrevLabel: string;
    pagerNextLabel: string;
    kennelMetaHeading: string;
  }>;
  /** Optional per-brand label overrides for the service-detail template
   *  fallback CTA. Defaults preserve agency-template English ("Browse All
   *  Services"). Brands like a kennel override this to read "See All
   *  Programs" without per-page duplication. */
  serviceTerms?: Partial<{
    browseAllLabel: string;
    browseAllHref: string;
  }>;
  positioning: {
    headline: string;
    headlineAccent?: string;
    badge?: string;
    lead: string;
    ctaPrimary: { label: string; href: string };
    ctaSecondary: { label: string; href: string };
  };
}

export interface AddonMetaConfig {
  name: string;
  content: string;
  attrs?: Record<string, string>;
}

export interface AddonJsonConfig {
  id: string;
  data: unknown;
}

/** Per-brand addon entry in site.json. Addons declared here are loaded in iteration order. */
export interface AddonEntry {
  enabled: boolean;
  meta?: AddonMetaConfig[];
  json?: AddonJsonConfig[];
}

export interface Site {
  /** Optional site-wide CTA styling. Picks a variant for the shared SiteCta
   *  component used at the bottom of /services, /work, /pricing, /faq. */
  cta?: {
    variant?: 'A' | 'B' | string;
  };
  nav: {
    primary: Array<{
      label: string;
      href: string;
      alternateLabel?: string;
      /** Authored mega-panel children. When present, overrides any auto-derived
       *  children for this href (services / work / pricing). Renders as a
       *  list-kind mega panel matching the Services dropdown's visual language.
       *  Each child can carry a `meta` blurb and an optional `featured` flag. */
      children?: Array<{ label: string; href: string; meta?: string; featured?: boolean }>;
    }>;
    cta: { label: string; href: string };
  };
  footer: {
    copyrightTemplate: string;
    ownerLink: string;
    /** Optional second credit (e.g., parent company). Substituted for {partnerName} in copyrightTemplate. */
    partner?: { name: string; link: string };
    extended?: {
      tagline?: string;
      location?: string;
      responseHours?: string;
      columns?: Array<{ heading: string; links: Array<{ label: string; href: string; external?: boolean }> }>;
      legal?: Array<{ label: string; href: string }>;
    };
  };
  skillsCarousel: {
    enabled: boolean;
    rows: Array<{ direction: 'left' | 'right'; items: string[] }>;
    /** Optional per-row group titles + bodies surfaced in the Capabilities
     *  modal (one entry per row). When absent, the component renders only
     *  the row items; brands that want the modal's "what each group means"
     *  framing populate these. Preserved per-brand instead of in shared
     *  component code so a copy leak (e.g. landscape language showing on a
     *  therapy site) can't ride a stale shared default into production. */
    groupTitles?: string[];
    groupBodies?: string[];
  };
  /** Optional global "next steps" content, reused across post-submit pages
   *  (e.g. /contact/success/). When absent, the <NextSteps /> component falls
   *  back to its own prop defaults so brands without this key still render. */
  nextSteps?: {
    sectionLabel?: string;
    steps: Array<{ num: string; title: string; body: string }>;
    aside?: {
      label?: string;
      links?: Array<{ iconKey?: string; label: string; href: string }>;
      home?: { label: string; href: string };
    };
  };
  errorPage: {
    code: string;
    heading: string;
    body: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
  addons?: Record<string, AddonEntry>;
}

export interface FaqGroup {
  id: string;
  title: string;
  faqs: Array<{ id: string; question: string; answer: string }>;
}

export interface FaqFile { groups: FaqGroup[]; }

function load<T>(relative: string): T {
  const abs = join(BRAND_ROOT, relative);
  return JSON.parse(readFileSync(abs, 'utf-8')) as T;
}

export const brand: Brand = load<Brand>('brand.json');
export const site: Site = load<Site>('site.json');
export const faqFile: FaqFile = load<FaqFile>('faq.json');

/** Shape of a single per-section override row baked into the brand. */
export interface SectionOverrideRow {
  type: string;          // matches data-section-type (e.g., "cta", "pricing")
  index: number;         // 0-based ordinal of that type on the page
  /** Heading text snapshot used as an identity tiebreak when section indices
   *  shift (e.g. user removes an earlier same-type section). When present,
   *  the runtime resolver matches by heading first and only falls back to
   *  index when no row's heading matches the live section. */
  sectionHeading?: string;
  theme?: 'light' | 'dark' | 'white' | 'black' | 'primary' | 'secondary' | 'vibrant';
  accent?: string;       // hex
  parallax?: 'on';
  parallaxUrl?: string;
  /** Marks the section as disabled. Live visitors won't see it; approved
   *  editor users see a grayed/collapsed stub with a "review" affordance. */
  disabled?: 'on';
}

/** Map of pathname → list of section overrides. */
export type SectionOverrides = Record<string, SectionOverrideRow[]>;

/** Description of a templated route group (e.g. all `/services/<slug>/` pages
 *  come from `src/pages/services/[slug].astro`). Section overrides can be saved
 *  against either an exact path or a group path (e.g. `/services/*`) so a style
 *  tweak on one child page can propagate across the whole template. */
export interface TemplatedGroup {
  /** Storage path used as the key everywhere (localStorage, baked JSON). */
  group: string;     // e.g. '/services/*'
  /** Path prefix used to test whether a visited pathname belongs to the group. */
  prefix: string;    // e.g. '/services/'
  /** Human-readable label used in editor copy. */
  label: string;     // e.g. 'service pages'
}

/**
 * Scans `src/pages/` for dynamic-slug routes (`<dir>/[slug].astro`) and returns
 * one group per matching directory. The editor uses the result to offer a
 * "Apply to all /services/ pages" scope when the user tweaks a section on a
 * templated child page; Base.astro's restore script uses the same list to
 * resolve group-scoped overrides back to each visited path.
 *
 * Convention-based on purpose — every brand gets the behavior for free,
 * without needing to restate the routing in site.json or brand.json.
 */
const PAGES_ROOT = join(process.cwd(), 'src', 'pages');
function humanizeGroupLabel(dir: string): string {
  // Drop trailing 's' for more natural copy ("service pages" vs "services pages").
  const base = dir.replace(/[-_]/g, ' ').trim();
  return `${base} pages`;
}
export function loadTemplatedGroups(): TemplatedGroup[] {
  if (!existsSync(PAGES_ROOT)) return [];
  const out: TemplatedGroup[] = [];
  const seen = new Set<string>();
  const walk = (absDir: string, relPrefix: string) => {
    let entries: string[];
    try { entries = readdirSync(absDir); } catch { return; }
    for (const name of entries) {
      const abs = join(absDir, name);
      let s;
      try { s = statSync(abs); } catch { continue; }
      if (s.isDirectory()) {
        walk(abs, relPrefix + '/' + name);
      } else if (/^\[[^\]]+\]\.astro$/.test(name)) {
        // Only top-level slug routes (e.g. /services/[slug].astro) are treated
        // as templated groups. Nested slug routes under another slug route are
        // rare enough to skip — keeps the scope chooser single-level for now.
        const key = relPrefix + '/*';
        if (seen.has(key) || relPrefix === '') continue;
        seen.add(key);
        const dirLabel = relPrefix.replace(/^\//, '').split('/').pop() || relPrefix;
        out.push({
          group: key,
          prefix: relPrefix + '/',
          label: humanizeGroupLabel(dirLabel),
        });
      }
    }
  };
  walk(PAGES_ROOT, '');
  return out.sort((a, b) => a.group.localeCompare(b.group));
}

/**
 * Loads the committed per-section overrides for this brand.
 *
 * Lives at `<brand>/section-overrides.json`. Authored by the in-page editor's
 * "Save to brand" button (which downloads the JSON) and applied via
 * `scripts/apply-section-overrides.mjs`. Inlined into Base.astro and merged
 * with per-browser localStorage so the deployed site reflects the editor's
 * committed state across sessions and devices.
 *
 * Returns an empty object when the file is missing or malformed so every
 * brand gets the behavior for free without needing a seed file.
 */
export function loadSectionOverrides(): SectionOverrides {
  const abs = join(BRAND_ROOT, 'section-overrides.json');
  if (!existsSync(abs)) return {};
  try {
    const data = JSON.parse(readFileSync(abs, 'utf-8'));
    if (!data || typeof data !== 'object') return {};
    const out: SectionOverrides = {};
    for (const [path, rows] of Object.entries(data)) {
      if (!Array.isArray(rows)) continue;
      const valid = (rows as any[])
        .filter((r) => r && typeof r.type === 'string' && Number.isFinite(r.index))
        .map((r) => {
          const row: SectionOverrideRow = { type: r.type, index: r.index };
          if (typeof r.sectionHeading === 'string' && r.sectionHeading.trim()) row.sectionHeading = r.sectionHeading.trim();
          if (r.theme === 'light' || r.theme === 'dark' || r.theme === 'white' || r.theme === 'black' || r.theme === 'primary' || r.theme === 'secondary' || r.theme === 'vibrant') row.theme = r.theme;
          if (typeof r.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.accent)) row.accent = r.accent.toLowerCase();
          if (r.parallax === 'on') row.parallax = 'on';
          if (typeof r.parallaxUrl === 'string' && /^https?:\/\//.test(r.parallaxUrl)) row.parallaxUrl = r.parallaxUrl;
          if (r.disabled === 'on') row.disabled = 'on';
          return row;
        })
        .filter((r) => r.theme || r.accent || r.parallax || r.parallaxUrl || r.disabled);
      if (valid.length) out[path] = valid;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Loads the brand's image gallery — a flat array of URLs at
 * `<brand>/gallery.json`. Inlined into Base.astro as `window.AED_GALLERY`
 * so the in-page editor's Images modal can show every shipped image,
 * not just the localStorage-staged paste buffer.
 */
export function loadBrandGallery(): string[] {
  const abs = join(BRAND_ROOT, 'gallery.json');
  if (!existsSync(abs)) return [];
  try {
    const data = JSON.parse(readFileSync(abs, 'utf-8'));
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of data) {
      if (typeof v !== 'string') continue;
      if (!/^(https?:\/\/|\/)/i.test(v)) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out;
  } catch {
    return [];
  }
}

/** Find FAQs by IDs or group IDs, preserving request order. */
export function resolveFaqs(opts: { faqIds?: string[]; groupIds?: string[] }) {
  const allFaqs = faqFile.groups.flatMap(g => g.faqs);
  if (opts.faqIds && opts.faqIds.length) {
    return opts.faqIds
      .map(id => allFaqs.find(f => f.id === id))
      .filter((f): f is NonNullable<typeof f> => !!f);
  }
  if (opts.groupIds && opts.groupIds.length) {
    return opts.groupIds
      .flatMap(gid => faqFile.groups.find(g => g.id === gid)?.faqs ?? []);
  }
  return [];
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
function colorBlock(c: BrandColors): string {
  return `  --bg-primary: ${c.bgPrimary};
  --bg-secondary: ${c.bgSecondary};
  --bg-card: ${c.bgCard};
  --bg-card-hover: ${c.bgCardHover};
  --bg-primary-rgb: ${hexToRgb(c.bgPrimary)};
  --bg-secondary-rgb: ${hexToRgb(c.bgSecondary)};
  --text-primary: ${c.textPrimary};
  --text-secondary: ${c.textSecondary};
  --text-muted: ${c.textMuted};
  --accent: ${c.accent};
  --accent-rgb: ${c.accentRgb};
  --accent-hover: ${c.accentHover};
  --accent-hover-rgb: ${c.accentHoverRgb};
  --accent-glow: rgba(var(--accent-rgb),0.15);
  --border: ${c.border};
  --border-light: ${c.borderLight};`;
}

// Fallbacks for every optional design-token section. These values match
// the hard-coded defaults that components used BEFORE tokenization, so
// brands that haven't opted into any of the new sections keep rendering
// exactly the same output.
const TOKEN_FALLBACKS = {
  borders:  { thin: '1px', medium: '2px', thick: '3px' },
  spacing:  { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', '2xl': '3rem' },
  shadows:  {
    sm: '0 1px 2px rgba(0,0,0,.35)',
    md: '0 4px 12px rgba(0,0,0,.45)',
    lg: '0 12px 28px rgba(0,0,0,.55)',
    xl: '0 24px 60px rgba(0,0,0,.65)',
  },
  motion: {
    durationFast: '120ms',
    durationBase: '220ms',
    durationSlow: '400ms',
    easingStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easingAccent:   'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  buttons: {
    // Aligned with the hard-coded `.btn` defaults so untokenized sites
    // stay visually identical. `radius: var(--radius)` deliberately
    // chains through the existing --radius token so `--btn-radius`
    // inherits brand radius by default.
    radius: 'var(--radius)',
    paddingX: '1.75rem',
    paddingY: '0.875rem',
    fontWeight: '600',
    letterSpacing: 'normal',
    textTransform: 'none',
    borderWidth: '0',
  },
} as const;
// Build a --var block from an object of { cssVarName → value }.
function varBlock(pairs: Array<[string, string]>): string {
  return pairs.map(([k, v]) => `  --${k}: ${v};`).join('\n');
}

/** Inline <style> snippet that redeclares :root tokens from the active brand. Emits a second :root[data-theme="light"] block when the brand provides a light palette. */
export function brandCssVars(): string {
  const c = brand.theme.colors;
  const light = brand.theme.lightColors;
  const t = brand.theme.typography;
  const fontStack = `'${t.fontFamily}', ${t.fallbacks}`;
  // Merge brand.theme.<section> over TOKEN_FALLBACKS so every var always
  // has a value — even if the brand hasn't adopted the new sections yet.
  const borders  = { ...TOKEN_FALLBACKS.borders,  ...(brand.theme.borders  || {}) };
  const spacing  = { ...TOKEN_FALLBACKS.spacing,  ...(brand.theme.spacing  || {}) };
  const shadows  = { ...TOKEN_FALLBACKS.shadows,  ...(brand.theme.shadows  || {}) };
  const motion   = { ...TOKEN_FALLBACKS.motion,   ...(brand.theme.motion   || {}) };
  const buttons  = { ...TOKEN_FALLBACKS.buttons,  ...(brand.theme.buttons  || {}) };
  const designTokens = varBlock([
    ['border-thin',    borders.thin],
    ['border-medium',  borders.medium],
    ['border-thick',   borders.thick],
    ['space-xs',       spacing.xs],
    ['space-sm',       spacing.sm],
    ['space-md',       spacing.md],
    ['space-lg',       spacing.lg],
    ['space-xl',       spacing.xl],
    ['space-2xl',      spacing['2xl']],
    ['shadow-sm',      shadows.sm],
    ['shadow-md',      shadows.md],
    ['shadow-lg',      shadows.lg],
    ['shadow-xl',      shadows.xl],
    ['motion-fast',       motion.durationFast],
    ['motion-base',       motion.durationBase],
    ['motion-slow',       motion.durationSlow],
    ['motion-ease',       motion.easingStandard],
    ['motion-ease-accent',motion.easingAccent],
    ['btn-radius',        buttons.radius],
    ['btn-pad-x',         buttons.paddingX],
    ['btn-pad-y',         buttons.paddingY],
    ['btn-font-weight',   buttons.fontWeight],
    ['btn-letter',        buttons.letterSpacing],
    ['btn-transform',     buttons.textTransform],
    ['btn-border-w',      buttons.borderWidth],
  ]);
  const base = `:root{
${colorBlock(c)}
  --radius: ${brand.theme.radius.base};
  --radius-lg: ${brand.theme.radius.lg};
  --max-w: ${brand.theme.maxWidth};
  --transition: var(--motion-base) var(--motion-ease);
  --font-family: ${fontStack};
${designTokens}
}`;
  if (!light) return base;
  return `${base}
:root[data-theme="light"],
:root[data-theme="vibrant"] [data-sec-theme="light"],
:root[data-theme="vibrant"] [data-sec-theme="white"]{
${colorBlock(light)}
}
:root[data-theme="light"] [data-sec-theme="dark"],
:root[data-theme="light"] [data-sec-theme="black"],
:root[data-theme="light"] [data-sec-theme="vibrant"]{
${colorBlock(c)}
}`;
}

/** @font-face declarations for the active brand's typography. */
export function brandFontFaceCss(): string {
  const t = brand.theme.typography;
  const faces: string[] = [];
  if (t.fontUrlExtended) {
    faces.push(`@font-face{font-family:'${t.fontFamily}';font-style:normal;font-weight:400 800;font-display:swap;src:url(${t.fontUrlExtended}) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}`);
  }
  if (t.fontUrl) {
    faces.push(`@font-face{font-family:'${t.fontFamily}';font-style:normal;font-weight:400 800;font-display:swap;src:url(${t.fontUrl}) format('woff2')}`);
  }
  return faces.join('\n');
}
