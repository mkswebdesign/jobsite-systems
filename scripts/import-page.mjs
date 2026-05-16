#!/usr/bin/env node
/**
 * Page import — Phase 1: dry-run only.
 *
 * Reads a bundle produced by `export-page.mjs`, validates it (same checks as
 * `validate-bundle.mjs`), and emits a typed write plan against a target brand.
 * Never writes anything. Phase 2 will introduce a wet mode with --overwrite /
 * --rename / --merge-faq-groups flags.
 *
 * Collision policy (per Prompt 10 design):
 *   slug-exists-content-matches  → skip silently
 *   slug-exists-content-differs  → REFUSE (Phase 1 has no overrides)
 *   id-exists-content-matches    → skip silently   (testimonials / faq items / faq groups)
 *   id-exists-content-differs    → REFUSE
 *
 * Soft warnings (advisory):
 *   - variant CSS missing on target
 *   - addon recommended but not enabled on target
 *   - internal href has no matching route on target
 *   - source page had section-overrides AND target already has overrides for the same path
 *   - asset url is per-brand-source or unknown
 *
 * Usage:
 *   node scripts/import-page.mjs <bundle.json> --target <brand> --dry-run
 *   node scripts/import-page.mjs - --target <brand> --dry-run        # stdin
 *
 *   npm run import-page -- <bundle.json> --target <brand> --dry-run
 *
 * Exits 0 if the plan is clean (no refusals). Exits 1 if any refusal blocks
 * the plan. Refusals print with file paths and the specific collision class
 * so the operator can fix the source brand or wait for Phase 2 wet mode.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { canonicalize } from './_lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const arichSourceRoot = resolve(projectRoot, '..', 'arich-source');

const args = parseArgs(process.argv.slice(2));

if (!args.target) {
  console.error('import-page: --target <brand> is required');
  process.exit(1);
}
if (!args.dryRun) {
  console.error('import-page: --dry-run is required (Phase 1 supports dry-run mode only; wet mode lands in Phase 2)');
  process.exit(1);
}
const bundlePath = args._[0];
if (!bundlePath) {
  console.error('import-page: bundle path required (use - for stdin)');
  console.error('  usage: node scripts/import-page.mjs <bundle.json> --target <brand> --dry-run');
  process.exit(1);
}

const targetBrand = args.target;
const targetContentDir = resolve(arichSourceRoot, 'content', 'brands', targetBrand);
if (!existsSync(targetContentDir)) {
  console.error(`import-page: target brand content dir not found: ${targetContentDir}`);
  process.exit(1);
}

let raw;
if (bundlePath === '-') {
  try { raw = readFileSync(0, 'utf-8'); }
  catch (err) { console.error('import-page: failed to read stdin: ' + err.message); process.exit(1); }
} else {
  if (!existsSync(bundlePath)) { console.error('import-page: bundle not found: ' + bundlePath); process.exit(1); }
  raw = readFileSync(bundlePath, 'utf-8');
}

let bundle;
try { bundle = JSON.parse(raw); }
catch (err) { console.error('import-page: invalid JSON: ' + err.message); process.exit(1); }

/* ---------- Validate the bundle (inline; same checks as validate-bundle.mjs) ---------- */
const validationErrors = validateBundle(bundle);
if (validationErrors.length > 0) {
  console.error('import-page: bundle invalid; refusing to plan');
  for (const e of validationErrors) console.error('  ' + e);
  process.exit(1);
}

/* ---------- Build the plan ---------- */
const plan = []; // { action, kind, pathLabel, size, why, detail? }
const refusals = []; // { kind, slug, pathLabel, why }
const warnings = []; // string

const pageSlug = bundle.source.slug;
const pagePathInBundle = bundle.page.path;

// PAGE
{
  const targetFlat = join(targetContentDir, 'pages', pageSlug + '.json');
  const targetFolder = join(targetContentDir, 'pages', pageSlug, 'page.json');
  let existing = null;
  let targetPath;
  if (existsSync(targetFlat))        { targetPath = targetFlat;   existing = readJsonSafe(targetFlat); }
  else if (existsSync(targetFolder)) { targetPath = targetFolder; existing = readJsonSafe(targetFolder); }
  else                                { targetPath = bundle.source.shape === 'folder' ? targetFolder : targetFlat; }
  classifyAndPush({ kind: 'page', slug: pageSlug, source: bundle.page, existing, targetPath, createAction: 'create-page' });
}

// SERVICES
for (const [slug, record] of Object.entries(bundle.deps.services || {})) {
  const targetPath = join(targetContentDir, 'services', slug + '.json');
  classifyAndPush({ kind: 'service', slug, source: record, existing: readJsonSafe(targetPath), targetPath, createAction: 'create-service' });
}

// WORK
for (const [slug, record] of Object.entries(bundle.deps.work || {})) {
  const targetPath = join(targetContentDir, 'work', slug + '.json');
  classifyAndPush({ kind: 'work', slug, source: record, existing: readJsonSafe(targetPath), targetPath, createAction: 'create-work' });
}

// TESTIMONIALS — keyed by id; merge subset into target's testimonials.json
const targetTestimonialsPath = join(targetContentDir, 'testimonials.json');
const targetTestimonialsById = indexById(loadCollection(targetTestimonialsPath, 'testimonials'));
for (const item of (bundle.deps.testimonials || [])) {
  if (!item || typeof item.id !== 'string') continue;
  classifyAndPush({
    kind: 'testimonial',
    slug: item.id,
    source: item,
    existing: targetTestimonialsById.get(item.id) || null,
    targetPath: targetTestimonialsPath,
    createAction: 'create-testimonial',
    detail: 'append to testimonials.json',
  });
}

// FAQS — both groups + items, both keyed by id
const targetFaqPath = join(targetContentDir, 'faq.json');
const { groupsById: targetFaqGroupsById, itemsById: targetFaqItemsById } = loadFaqIndex(targetFaqPath);
for (const group of (bundle.deps.faqs?.groups || [])) {
  if (!group || typeof group.id !== 'string') continue;
  classifyAndPush({
    kind: 'faq-group',
    slug: group.id,
    source: group,
    existing: targetFaqGroupsById.get(group.id) || null,
    targetPath: targetFaqPath,
    createAction: 'create-faq-group',
    detail: 'append to faq.json groups[]',
  });
}
for (const item of (bundle.deps.faqs?.items || [])) {
  if (!item || typeof item.id !== 'string') continue;
  classifyAndPush({
    kind: 'faq-item',
    slug: item.id,
    source: item,
    existing: targetFaqItemsById.get(item.id) || null,
    targetPath: targetFaqPath,
    createAction: 'create-faq-item',
    detail: 'append to faq.json',
  });
}

// SECTION OVERRIDES (advisory)
if (Array.isArray(bundle.sectionOverrides) && bundle.sectionOverrides.length > 0) {
  const targetOverridesPath = join(targetContentDir, 'section-overrides.json');
  let existing = null;
  if (existsSync(targetOverridesPath)) {
    try {
      const data = JSON.parse(readFileSync(targetOverridesPath, 'utf-8'));
      if (data && typeof data === 'object' && Array.isArray(data[pagePathInBundle])) existing = data[pagePathInBundle];
    } catch { /* malformed override file is non-blocking */ }
  }
  if (existing) {
    warnings.push(`apply-overrides: target brand already has ${existing.length} override row(s) for path '${pagePathInBundle}'; Phase 1 collision policy is advisory — keep target's. Source had ${bundle.sectionOverrides.length} row(s).`);
  } else {
    plan.push({
      action: 'apply-overrides',
      kind: 'overrides',
      pathLabel: relTarget(targetOverridesPath) + `[\"${pagePathInBundle}\"]`,
      size: JSON.stringify(bundle.sectionOverrides).length,
      why: `${bundle.sectionOverrides.length} per-section override row(s) for page path '${pagePathInBundle}'`,
    });
  }
}

// ASSETS (advisory)
for (const asset of (bundle.assets || [])) {
  if (asset.kind === 'per-brand-source') {
    const rewriteTo = (asset.rewriteTo || '').replace('<TARGET_BRAND>', targetBrand);
    plan.push({
      action: 'rewrite-asset',
      kind: 'asset',
      pathLabel: rewriteTo || '(missing rewriteTo)',
      size: 0,
      why: `per-brand asset url ${asset.url} (rewrite path; manual file copy still required in Phase 5+)`,
    });
  } else if (asset.kind === 'unknown') {
    warnings.push(`asset of unknown kind: ${asset.url} at ${asset.usage || '(no usage path)'} — agent must classify before wet import`);
  }
}

// VARIANT CSS COVERAGE (advisory)
const targetBrandCssPath = join(projectRoot, 'src', 'builder', 'styles', 'brands', targetBrand + '.css');
const targetBrandCss = existsSync(targetBrandCssPath) ? readFileSync(targetBrandCssPath, 'utf-8') : '';
const KIND_BY_TYPE = parseRegistryKindMap();
for (const v of (bundle.compat?.variantsUsed || [])) {
  if (!v || typeof v.variant !== 'string') continue;
  // Only check uppercase letter variants — kebab variants like 'carousel'/'grid' have different patterns
  if (!/^[A-Z]$/.test(v.variant)) continue;
  const kind = KIND_BY_TYPE[v.type] || kebabFromCamel(v.type);
  const probe1 = `[data-${kind}-variant='${v.variant}']`;
  const probe2 = `[data-${kind}-variant=\"${v.variant}\"]`;
  if (!targetBrandCss.includes(probe1) && !targetBrandCss.includes(probe2)) {
    warnings.push(`variant '${v.variant}' for type '${v.type}' has no CSS rule in ${targetBrand}.css (looked for ${probe1}); will fall back to default styling`);
  }
}

// ADDON COVERAGE (advisory)
const targetSiteJsonPath = join(targetContentDir, 'site.json');
let targetAddons = {};
if (existsSync(targetSiteJsonPath)) {
  try { targetAddons = JSON.parse(readFileSync(targetSiteJsonPath, 'utf-8'))?.addons || {}; }
  catch { /* malformed site.json — skip this advisory */ }
}
for (const addon of (bundle.compat?.addonsRecommended || [])) {
  const entry = targetAddons[addon];
  if (!entry || !entry.enabled) {
    warnings.push(`recommended addon '${addon}' is not enabled in ${targetBrand}/site.json; page may render but lose intended behavior`);
  }
}

// INTERNAL HREF COVERAGE (advisory)
const targetRoutes = collectTargetRoutes(targetContentDir);
for (const href of (bundle.compat?.internalHrefs || [])) {
  if (!targetRoutes.has(href)) {
    warnings.push(`internal href '${href}' has no matching page route in ${targetBrand}/pages/; link may 404 after import`);
  }
}

/* ---------- Output ---------- */

console.log(`import-page: dry-run plan for bundle '${bundle.source.brand}/${bundle.source.slug}' → target '${targetBrand}'`);
console.log(`  bundle path: ${bundlePath === '-' ? '<stdin>' : bundlePath}`);
console.log('');

if (plan.length === 0 && refusals.length === 0 && warnings.length === 0) {
  console.log('  (empty plan — bundle has no actionable content for this target)');
}
for (const p of plan) {
  const sizeNote = p.size ? `  (${p.size}B)` : '';
  console.log(`  [${p.action}]  ${p.pathLabel}${sizeNote}`);
  console.log(`     ${p.why}`);
  if (p.detail) console.log(`     ${p.detail}`);
}
for (const r of refusals) {
  console.log(`  [REFUSE]      ${r.pathLabel}`);
  console.log(`     ${r.why}`);
}
for (const w of warnings) {
  console.log(`  [warn]        ${w}`);
}

console.log('');
const counts = {
  create: plan.filter((p) => p.action.startsWith('create-')).length,
  skip:   plan.filter((p) => p.action === 'skip').length,
  overrides: plan.filter((p) => p.action === 'apply-overrides').length,
  rewriteAsset: plan.filter((p) => p.action === 'rewrite-asset').length,
};
console.log(`import-page: would-create=${counts.create} would-skip=${counts.skip} apply-overrides=${counts.overrides} rewrite-asset=${counts.rewriteAsset} warn=${warnings.length} refuse=${refusals.length}`);

if (refusals.length > 0) {
  console.error('');
  console.error(`import-page: ${refusals.length} refusal(s); plan is BLOCKED.`);
  console.error('  Refusals fire when a slug/id already exists in the target with different content.');
  console.error('  Phase 2 wet mode will support --overwrite / --rename to resolve. Until then, the source brand must be patched.');
  process.exit(1);
}
console.log('import-page: plan is clean (Phase 1 dry-run; no writes performed).');
process.exit(0);

/* ===== helpers ===== */

function classifyAndPush({ kind, slug, source, existing, targetPath, createAction, detail }) {
  if (!existing) {
    plan.push({
      action: createAction,
      kind,
      pathLabel: relTarget(targetPath),
      size: JSON.stringify(source).length,
      why: `${kind} '${slug}' not present in ${targetBrand}; will be created`,
      detail,
    });
    return;
  }
  if (canonicalize(source) === canonicalize(existing)) {
    plan.push({
      action: 'skip',
      kind,
      pathLabel: relTarget(targetPath),
      size: 0,
      why: `${kind} '${slug}' exists with identical content (slug-exists-content-matches)`,
      detail,
    });
  } else {
    refusals.push({
      kind,
      slug,
      pathLabel: relTarget(targetPath),
      why: `${kind} '${slug}' exists in ${targetBrand} but content differs (slug-exists-content-differs)`,
    });
  }
}

function readJsonSafe(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

function loadCollection(path, kind) {
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    return Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  } catch { return []; }
}

function indexById(arr) {
  const m = new Map();
  for (const item of arr) if (item && typeof item.id === 'string') m.set(item.id, item);
  return m;
}

function loadFaqIndex(path) {
  const groupsById = new Map();
  const itemsById = new Map();
  if (!existsSync(path)) return { groupsById, itemsById };
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const groups = Array.isArray(data) ? data : Array.isArray(data.groups) ? data.groups : [];
    for (const g of groups) {
      if (g && typeof g.id === 'string') groupsById.set(g.id, g);
      for (const f of (g?.faqs || g?.items || [])) if (f && typeof f.id === 'string') itemsById.set(f.id, f);
    }
    const flat = Array.isArray(data?.items) ? data.items : Array.isArray(data?.faqs) ? data.faqs : [];
    for (const f of flat) if (f && typeof f.id === 'string') itemsById.set(f.id, f);
  } catch { /* malformed; both maps empty */ }
  return { groupsById, itemsById };
}

function collectTargetRoutes(brandDir) {
  const routes = new Set();
  const pagesDir = join(brandDir, 'pages');
  if (!existsSync(pagesDir)) return routes;
  try {
    for (const entry of readdirSync(pagesDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        routes.add('/' + entry.name + '/');
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const slug = entry.name.replace(/\.json$/, '');
        routes.add(slug === 'home' ? '/' : '/' + slug + '/');
      }
    }
  } catch { /* unreadable pages/ — leave route set empty (will warn on every internal href) */ }
  return routes;
}

function parseRegistryKindMap() {
  const sectionsTs = join(projectRoot, 'src', 'builder', 'lib', 'sections.ts');
  if (!existsSync(sectionsTs)) return {};
  let src;
  try { src = readFileSync(sectionsTs, 'utf-8'); } catch { return {}; }
  const arr = src.match(/SECTION_REGISTRY[^=]*=\s*\[([\s\S]*?)\]\s*;/);
  if (!arr) return {};
  const out = {};
  const objRe = /\{([^{}]+)\}/g;
  let m;
  while ((m = objRe.exec(arr[1]))) {
    const fields = {};
    for (const fm of m[1].matchAll(/(\w+)\s*:\s*['"]([^'"]+)['"]/g)) fields[fm[1]] = fm[2];
    if (fields.type && fields.kind) out[fields.type] = fields.kind;
  }
  return out;
}

function kebabFromCamel(s) {
  return String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function validateBundle(bundle) {
  const errs = [];
  if (bundle.bundleVersion !== 1) errs.push('bundleVersion must be 1 (got ' + JSON.stringify(bundle.bundleVersion) + ')');
  if (!bundle.source || typeof bundle.source !== 'object') errs.push('source object missing');
  else {
    if (!bundle.source.brand) errs.push('source.brand required');
    if (!bundle.source.slug) errs.push('source.slug required');
  }
  if (!bundle.page || typeof bundle.page !== 'object') errs.push('page required');
  if (!bundle.deps || typeof bundle.deps !== 'object') errs.push('deps required');
  if (!Array.isArray(bundle.assets)) errs.push('assets must be an array');
  if (!bundle.compat || typeof bundle.compat !== 'object') errs.push('compat required');
  if (typeof bundle.checksum !== 'string') errs.push('checksum must be a string');
  if (errs.length === 0) {
    const recomputed = createHash('sha256').update(canonicalize({ page: bundle.page, deps: bundle.deps })).digest('hex');
    if (recomputed !== bundle.checksum) {
      errs.push(`checksum mismatch: stored=${String(bundle.checksum).slice(0,16)}… recomputed=${recomputed.slice(0,16)}…`);
    }
  }
  return errs;
}

function relTarget(p) {
  const parent = resolve(projectRoot, '..');
  if (p.startsWith(parent)) return '../' + p.slice(parent.length + 1).replace(/\\/g, '/');
  return p.replace(/\\/g, '/');
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--target') out.target = argv[++i];
    else if (a.startsWith('--target=')) out.target = a.slice('--target='.length);
    else if (!a.startsWith('--')) out._.push(a);
  }
  return out;
}
