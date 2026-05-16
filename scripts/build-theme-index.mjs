#!/usr/bin/env node
/**
 * Post-build: emit dist/assets/theme/index.json — the source of truth the in-page
 * editor reads to render its Theme panel (global colors, typography, radius).
 *
 * Shape mirrors build-addon-index.mjs: a "sections" list where each section
 * has a set of editable "tokens". Each token carries the JSON path back into
 * brand.json so the editor can produce a copy-paste patch the user applies.
 *
 *   {
 *     "brand": "<active-brand>",
 *     "generatedAt": "<iso8601>",
 *     "sections": [
 *       {
 *         "id": "colors-dark",
 *         "label": "Colors · Dark mode",
 *         "path": ["theme", "colors"],
 *         "tokens": [
 *           { "key": "bgPrimary", "label": "Background · primary",
 *             "kind": "color", "value": "#0a0a0b", "cssVar": "--bg-primary" },
 *           ...
 *         ]
 *       },
 *       ...
 *     ]
 *   }
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const brand = process.env.BRAND || 'arich';
const brandJsonPath = join(projectRoot, '..', 'arich-source', 'content', 'brands', brand, 'brand.json');
const outDir = join(projectRoot, 'dist', 'assets', 'theme');
const outFile = join(outDir, 'index.json');

if (!existsSync(brandJsonPath)) {
  console.warn(`theme index: brand.json not found at ${brandJsonPath}; skipping`);
  process.exit(0);
}

const brandData = JSON.parse(readFileSync(brandJsonPath, 'utf-8'));
const theme = brandData.theme || {};

/**
 * Color-token labels + CSS custom-property mapping.
 * Must stay in sync with src/builder/lib/brand.ts colorBlock().
 */
const COLOR_TOKENS = [
  { key: 'bgPrimary',      label: 'Background · primary',        cssVar: '--bg-primary' },
  { key: 'bgSecondary',    label: 'Background · secondary',      cssVar: '--bg-secondary' },
  { key: 'bgCard',         label: 'Background · card',           cssVar: '--bg-card' },
  { key: 'bgCardHover',    label: 'Background · card hover',     cssVar: '--bg-card-hover' },
  { key: 'textPrimary',    label: 'Text · primary',              cssVar: '--text-primary' },
  { key: 'textSecondary',  label: 'Text · secondary',            cssVar: '--text-secondary' },
  { key: 'textMuted',      label: 'Text · muted',                cssVar: '--text-muted' },
  { key: 'accent',         label: 'Accent',                      cssVar: '--accent' },
  { key: 'accentHover',    label: 'Accent · hover',              cssVar: '--accent-hover' },
  { key: 'border',         label: 'Border',                      cssVar: '--border' },
  { key: 'borderLight',    label: 'Border · light',              cssVar: '--border-light' },
];

/**
 * Keys we don't expose as editable tokens — they're auto-derived from the hex on
 * save (the editor computes RGB so the user never types it). Left in the manifest
 * for transparency.
 */
const DERIVED_COLOR_KEYS = ['accentRgb', 'accentHoverRgb'];

function buildColorSection(id, label, srcPath, palette) {
  if (!palette || typeof palette !== 'object') return null;
  return {
    id,
    label,
    path: srcPath,
    kind: 'colors',
    tokens: COLOR_TOKENS
      .filter((t) => typeof palette[t.key] === 'string')
      .map((t) => ({
        key: t.key,
        label: t.label,
        kind: 'color',
        value: palette[t.key],
        cssVar: t.cssVar,
      })),
    derived: DERIVED_COLOR_KEYS.filter((k) => typeof palette[k] === 'string'),
  };
}

function buildTypographySection(t) {
  if (!t || typeof t !== 'object') return null;
  const tokens = [];
  if ('fontFamily' in t) tokens.push({ key: 'fontFamily', label: 'Font family',   kind: 'text', value: t.fontFamily, cssVar: '--font-family', hint: 'First family in stack' });
  if ('fallbacks'  in t) tokens.push({ key: 'fallbacks',  label: 'Font fallbacks', kind: 'text', value: t.fallbacks,  hint: 'Comma-separated, applied after fontFamily' });
  if ('fontUrl'    in t) tokens.push({ key: 'fontUrl',    label: 'Font URL',        kind: 'text', value: t.fontUrl ?? '', hint: 'woff2 primary face' });
  if ('fontUrlExtended' in t) tokens.push({ key: 'fontUrlExtended', label: 'Font URL · extended', kind: 'text', value: t.fontUrlExtended ?? '', hint: 'Extended Latin face (optional)' });
  return { id: 'typography', label: 'Typography', path: ['theme', 'typography'], kind: 'object', tokens };
}

function buildRadiusSection(r) {
  if (!r || typeof r !== 'object') return null;
  const tokens = [];
  if ('base' in r) tokens.push({ key: 'base', label: 'Radius · base', kind: 'length', value: r.base, cssVar: '--radius' });
  if ('lg'   in r) tokens.push({ key: 'lg',   label: 'Radius · large', kind: 'length', value: r.lg,   cssVar: '--radius-lg' });
  return { id: 'radius', label: 'Corner radius', path: ['theme', 'radius'], kind: 'object', tokens };
}

function buildLayoutSection() {
  const tokens = [];
  if (typeof theme.maxWidth === 'string') {
    tokens.push({ key: 'maxWidth', label: 'Max content width', kind: 'length', value: theme.maxWidth, cssVar: '--max-w' });
  }
  if (typeof theme.mode === 'string') {
    tokens.push({
      key: 'mode', label: 'Default color mode', kind: 'select',
      value: theme.mode, options: ['dark', 'light', 'system'],
      hint: 'Which palette the page loads in before any user toggle',
    });
  }
  if (!tokens.length) return null;
  return { id: 'layout', label: 'Layout & mode', path: ['theme'], kind: 'flat', tokens };
}

// Buttons — global button look. Every token is OPTIONAL in brand.json
// so brands that don't set any of them still get a clean theme index.
// CSS consumers should reference var(--btn-*) with sane fallbacks.
function buildButtonsSection(b) {
  if (!b || typeof b !== 'object') return null;
  const tokens = [];
  if ('radius'          in b) tokens.push({ key: 'radius',         label: 'Button · radius',       kind: 'length', value: b.radius,         cssVar: '--btn-radius' });
  if ('paddingX'        in b) tokens.push({ key: 'paddingX',       label: 'Button · padding X',    kind: 'length', value: b.paddingX,       cssVar: '--btn-pad-x' });
  if ('paddingY'        in b) tokens.push({ key: 'paddingY',       label: 'Button · padding Y',    kind: 'length', value: b.paddingY,       cssVar: '--btn-pad-y' });
  if ('fontWeight'      in b) tokens.push({ key: 'fontWeight',     label: 'Button · font weight',  kind: 'select', value: b.fontWeight,     cssVar: '--btn-font-weight', options: ['400', '500', '600', '700', '800'] });
  if ('letterSpacing'   in b) tokens.push({ key: 'letterSpacing',  label: 'Button · letter spacing', kind: 'length', value: b.letterSpacing, cssVar: '--btn-letter' });
  if ('textTransform'   in b) tokens.push({ key: 'textTransform',  label: 'Button · text transform', kind: 'select', value: b.textTransform, cssVar: '--btn-transform', options: ['none', 'uppercase', 'lowercase', 'capitalize'] });
  if ('borderWidth'     in b) tokens.push({ key: 'borderWidth',    label: 'Button · border width', kind: 'length', value: b.borderWidth,    cssVar: '--btn-border-w' });
  if (!tokens.length) return null;
  return { id: 'buttons', label: 'Buttons', path: ['theme', 'buttons'], kind: 'object', tokens };
}

// Shadows — drop-shadow scale, values are full CSS box-shadow strings.
function buildShadowsSection(s) {
  if (!s || typeof s !== 'object') return null;
  const tokens = [];
  const tiers = [
    ['sm',  'Shadow · small',  '--shadow-sm'],
    ['md',  'Shadow · medium', '--shadow-md'],
    ['lg',  'Shadow · large',  '--shadow-lg'],
    ['xl',  'Shadow · x-large','--shadow-xl'],
  ];
  for (const [k, label, cssVar] of tiers) {
    if (k in s) tokens.push({ key: k, label, kind: 'text', value: s[k], cssVar });
  }
  if (!tokens.length) return null;
  return { id: 'shadows', label: 'Shadows', path: ['theme', 'shadows'], kind: 'object', tokens };
}

// Spacing — scale from xs to 2xl. Every rung optional.
function buildSpacingSection(sp) {
  if (!sp || typeof sp !== 'object') return null;
  const tokens = [];
  const tiers = [
    ['xs',  'Spacing · xs',  '--space-xs'],
    ['sm',  'Spacing · sm',  '--space-sm'],
    ['md',  'Spacing · md',  '--space-md'],
    ['lg',  'Spacing · lg',  '--space-lg'],
    ['xl',  'Spacing · xl',  '--space-xl'],
    ['2xl', 'Spacing · 2xl', '--space-2xl'],
  ];
  for (const [k, label, cssVar] of tiers) {
    if (k in sp) tokens.push({ key: k, label, kind: 'length', value: sp[k], cssVar });
  }
  if (!tokens.length) return null;
  return { id: 'spacing', label: 'Spacing scale', path: ['theme', 'spacing'], kind: 'object', tokens };
}

// Motion — transition duration + easing tokens used across the theme.
function buildMotionSection(m) {
  if (!m || typeof m !== 'object') return null;
  const tokens = [];
  if ('durationFast' in m) tokens.push({ key: 'durationFast', label: 'Duration · fast',    kind: 'length', value: m.durationFast, cssVar: '--motion-fast' });
  if ('durationBase' in m) tokens.push({ key: 'durationBase', label: 'Duration · base',    kind: 'length', value: m.durationBase, cssVar: '--motion-base' });
  if ('durationSlow' in m) tokens.push({ key: 'durationSlow', label: 'Duration · slow',    kind: 'length', value: m.durationSlow, cssVar: '--motion-slow' });
  if ('easingStandard' in m) tokens.push({ key: 'easingStandard', label: 'Easing · standard', kind: 'text', value: m.easingStandard, cssVar: '--motion-ease' });
  if ('easingAccent'   in m) tokens.push({ key: 'easingAccent',   label: 'Easing · accent',   kind: 'text', value: m.easingAccent,   cssVar: '--motion-ease-accent' });
  if (!tokens.length) return null;
  return { id: 'motion', label: 'Motion', path: ['theme', 'motion'], kind: 'object', tokens };
}

// Borders — widths used site-wide.
function buildBordersSection(br) {
  if (!br || typeof br !== 'object') return null;
  const tokens = [];
  const tiers = [
    ['thin',   'Border · thin',   '--border-thin'],
    ['medium', 'Border · medium', '--border-medium'],
    ['thick',  'Border · thick',  '--border-thick'],
  ];
  for (const [k, label, cssVar] of tiers) {
    if (k in br) tokens.push({ key: k, label, kind: 'length', value: br[k], cssVar });
  }
  if (!tokens.length) return null;
  return { id: 'borders', label: 'Border widths', path: ['theme', 'borders'], kind: 'object', tokens };
}

const sections = [
  buildColorSection('colors-dark',  'Colors · Dark mode',  ['theme', 'colors'],       theme.colors),
  buildColorSection('colors-light', 'Colors · Light mode', ['theme', 'lightColors'],  theme.lightColors),
  buildTypographySection(theme.typography),
  buildRadiusSection(theme.radius),
  buildBordersSection(theme.borders),
  buildSpacingSection(theme.spacing),
  buildShadowsSection(theme.shadows),
  buildMotionSection(theme.motion),
  buildButtonsSection(theme.buttons),
  buildLayoutSection(),
].filter(Boolean);

const out = {
  brand,
  generatedAt: new Date().toISOString(),
  sections,
};

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(out, null, 2));
const tokenCount = sections.reduce((n, s) => n + s.tokens.length, 0);
console.log(`theme index: ${sections.length} sections, ${tokenCount} tokens for brand=${brand}`);
