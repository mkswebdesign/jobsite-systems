#!/usr/bin/env node
/**
 * Page export — read-only Phase 1.
 *
 * Walks a brand's page (`pages/<slug>.json` or `pages/<slug>/page.json`),
 * inlines folder-style section file refs, resolves cross-refs (services,
 * work, testimonials, faqs), surfaces asset URLs and internal hrefs,
 * computes a checksum, and writes the bundle to `<projectRoot>/out/`.
 *
 * Phase 1 supports `sections[]`-style pages only. Named-block pages (mixed
 * top-level keys like `header`/`intro`/`philosophy`) are refused — they need
 * per-template walkers, deferred to Phase 2.
 *
 * Usage:
 *   BRAND=best-futbol node scripts/export-page.mjs home
 *   BRAND=best-futbol node scripts/export-page.mjs home --stdout
 *   BRAND=best-futbol node scripts/export-page.mjs home --output ./out/foo.json
 *   BRAND=best-futbol node scripts/export-page.mjs home --overwrite
 *
 * Pipeline-friendly:
 *   BRAND=<b> node scripts/export-page.mjs <slug> --stdout | node scripts/validate-bundle.mjs -
 *
 * Read-only: never writes to any brand content folder. Output goes to
 * `<projectRoot>/out/<brand>-<slug>-bundle.json` (gitignored) by default.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { canonicalize, parseEditorVersion } from './_lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const KNOWN_TOP_LEVEL = new Set(['slug', 'path', 'seo', 'breadcrumbLabel', 'sections', 'testimonials']);

const ADDON_HINTS = {
  photoGallery: ['image-lightbox'],
};

const args = parseArgs(process.argv.slice(2));
const brand = process.env.BRAND;
if (!brand) {
  console.error('export-page: BRAND env var is required (e.g. BRAND=best-futbol node scripts/export-page.mjs home)');
  process.exit(1);
}
const slug = args._[0];
if (!slug) {
  console.error('export-page: missing <slug> argument (e.g. BRAND=best-futbol node scripts/export-page.mjs home)');
  process.exit(1);
}

const contentRoot = resolve(projectRoot, '..', 'arich-source', 'content', 'brands', brand);
if (!existsSync(contentRoot)) {
  console.error(`export-page: brand content dir not found at ${contentRoot}`);
  process.exit(1);
}

const flatPagePath = join(contentRoot, 'pages', slug + '.json');
const folderPagePath = join(contentRoot, 'pages', slug, 'page.json');
let pagePath = null;
let pageShape = null;
if (existsSync(flatPagePath)) { pagePath = flatPagePath; pageShape = 'flat'; }
else if (existsSync(folderPagePath)) { pagePath = folderPagePath; pageShape = 'folder'; }
else {
  console.error(`export-page: page '${slug}' not found at:\n  ${flatPagePath}\n  ${folderPagePath}`);
  process.exit(1);
}

let page;
try {
  page = JSON.parse(readFileSync(pagePath, 'utf-8'));
} catch (err) {
  console.error(`export-page: failed to parse ${pagePath}: ${err.message}`);
  process.exit(1);
}

if (pageShape === 'folder' && Array.isArray(page.sections)) {
  const folderDir = dirname(pagePath);
  const inlined = [];
  for (let i = 0; i < page.sections.length; i++) {
    const entry = page.sections[i];
    if (typeof entry === 'string') {
      const secPath = resolve(folderDir, entry);
      if (!existsSync(secPath)) {
        console.error(`export-page: missing section file '${entry}' referenced by ${pagePath}`);
        process.exit(1);
      }
      try { inlined.push(JSON.parse(readFileSync(secPath, 'utf-8'))); }
      catch (err) {
        console.error(`export-page: failed to parse section file ${secPath}: ${err.message}`);
        process.exit(1);
      }
    } else if (entry && typeof entry === 'object') {
      inlined.push(entry);
    } else {
      console.error(`export-page: page.sections[${i}] is neither a string nor an object`);
      process.exit(1);
    }
  }
  page.sections = inlined;
}

const topLevelKeys = Object.keys(page);
const unknownKeys = topLevelKeys.filter((k) => !KNOWN_TOP_LEVEL.has(k));
if (unknownKeys.length > 0) {
  console.error(`export-page: page '${slug}' uses named-block shape (top-level keys outside the known set: ${unknownKeys.join(', ')}); export-page Phase 1 supports sections[]-style pages only.`);
  process.exit(1);
}
if (!Array.isArray(page.sections) || page.sections.length === 0) {
  console.error(`export-page: page '${slug}' has no sections[] array; Phase 1 requires at least one section.`);
  process.exit(1);
}

const errors = [];
const services = {};
const work = {};
const testimonialIdsRequested = new Set();
const faqIdsRequested = new Set();
const groupIdsRequested = new Set();

for (const sec of page.sections) {
  if (Array.isArray(sec.serviceSlugs)) sec.serviceSlugs.forEach(collectService);
  if (Array.isArray(sec.workSlugs)) sec.workSlugs.forEach(collectWork);
  if (Array.isArray(sec.testimonialIds)) sec.testimonialIds.forEach((id) => testimonialIdsRequested.add(id));
  if (Array.isArray(sec.faqIds)) sec.faqIds.forEach((id) => faqIdsRequested.add(id));
  if (Array.isArray(sec.groupIds)) sec.groupIds.forEach((id) => groupIdsRequested.add(id));
}

function collectService(s) {
  if (typeof s !== 'string' || services[s]) return;
  const p = join(contentRoot, 'services', s + '.json');
  if (!existsSync(p)) { errors.push(`unresolved service slug '${s}' (looked at ${p})`); return; }
  try { services[s] = JSON.parse(readFileSync(p, 'utf-8')); }
  catch (err) { errors.push(`failed to parse services/${s}.json: ${err.message}`); }
}
function collectWork(s) {
  if (typeof s !== 'string' || work[s]) return;
  const p = join(contentRoot, 'work', s + '.json');
  if (!existsSync(p)) { errors.push(`unresolved work slug '${s}' (looked at ${p})`); return; }
  try { work[s] = JSON.parse(readFileSync(p, 'utf-8')); }
  catch (err) { errors.push(`failed to parse work/${s}.json: ${err.message}`); }
}

const testimonials = [];
if (testimonialIdsRequested.size > 0) {
  const tPath = join(contentRoot, 'testimonials.json');
  if (!existsSync(tPath)) {
    errors.push(`testimonials.json not found at ${tPath}, but page references ${testimonialIdsRequested.size} id(s)`);
  } else {
    try {
      const data = JSON.parse(readFileSync(tPath, 'utf-8'));
      const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      const found = new Set();
      for (const item of items) {
        if (item && typeof item.id === 'string' && testimonialIdsRequested.has(item.id)) {
          testimonials.push(item);
          found.add(item.id);
        }
      }
      for (const id of testimonialIdsRequested) {
        if (!found.has(id)) errors.push(`unresolved testimonialId '${id}' (not in ${tPath})`);
      }
    } catch (err) { errors.push(`failed to parse testimonials.json: ${err.message}`); }
  }
}

const faqs = { groups: [], items: [] };
if (faqIdsRequested.size > 0 || groupIdsRequested.size > 0) {
  const fPath = join(contentRoot, 'faq.json');
  if (!existsSync(fPath)) {
    errors.push(`faq.json not found at ${fPath}, but page references ${faqIdsRequested.size + groupIdsRequested.size} faq/group id(s)`);
  } else {
    try {
      const data = JSON.parse(readFileSync(fPath, 'utf-8'));
      const groups = Array.isArray(data) ? data : Array.isArray(data.groups) ? data.groups : [];
      const referencedGroupIds = new Set();
      const foundFaqIds = new Set();
      for (const g of groups) {
        if (g && typeof g.id === 'string' && groupIdsRequested.has(g.id)) {
          faqs.groups.push(g);
          referencedGroupIds.add(g.id);
          for (const f of (g.faqs || g.items || [])) {
            if (f && typeof f.id === 'string') foundFaqIds.add(f.id);
          }
        }
      }
      for (const g of groups) {
        if (!g || referencedGroupIds.has(g.id)) continue;
        for (const f of (g.faqs || g.items || [])) {
          if (f && typeof f.id === 'string' && faqIdsRequested.has(f.id)) {
            faqs.items.push(f);
            foundFaqIds.add(f.id);
          }
        }
      }
      const flat = Array.isArray(data?.items) ? data.items : Array.isArray(data?.faqs) ? data.faqs : [];
      for (const f of flat) {
        if (f && typeof f.id === 'string' && faqIdsRequested.has(f.id) && !foundFaqIds.has(f.id)) {
          faqs.items.push(f);
          foundFaqIds.add(f.id);
        }
      }
      for (const id of faqIdsRequested) {
        if (!foundFaqIds.has(id)) errors.push(`unresolved faqId '${id}' (not in ${fPath})`);
      }
      for (const id of groupIdsRequested) {
        if (!referencedGroupIds.has(id)) errors.push(`unresolved groupId '${id}' (not in ${fPath})`);
      }
    } catch (err) { errors.push(`failed to parse faq.json: ${err.message}`); }
  }
}

if (errors.length > 0) {
  console.error(`export-page: ${errors.length} unresolved reference(s) in ${brand}/${slug}:`);
  for (const e of errors) console.error('  ' + e);
  console.error('  fix the brand content (run validate-brand) before exporting.');
  process.exit(1);
}

const assets = [];
const internalHrefs = new Set();
const seenAssetUrls = new Set();
walk({ page, deps: { services, work, testimonials, faqs } }, '');

function walk(value, path) {
  if (typeof value === 'string') { classifyString(value, path); return; }
  if (Array.isArray(value)) { for (let i = 0; i < value.length; i++) walk(value[i], path + '[' + i + ']'); return; }
  if (value && typeof value === 'object') { for (const [k, v] of Object.entries(value)) walk(v, path + '.' + k); }
}
function classifyString(s, path) {
  if (/^https?:\/\//.test(s)) {
    if (looksLikeAsset(path) || isImageUrl(s)) addAsset(s, path, 'external');
    return;
  }
  if (s.startsWith('/assets/brands/' + brand + '/')) { addAsset(s, path, 'per-brand-source'); return; }
  if (s.startsWith('/assets/brands/'))                { addAsset(s, path, 'unknown');           return; }
  if (s.startsWith('/assets/'))                        { addAsset(s, path, 'build-asset');       return; }
  if (s.startsWith('/') && (path.endsWith('.href') || path.endsWith('.canonical') || /\.href$|Href$/.test(path))) {
    internalHrefs.add(s);
  }
}
function looksLikeAsset(path) {
  return /\b(image|src|heroImage|backgroundImage|backgroundImages|ogImage|headshot|avatar|favicon)\b/i.test(path);
}
function isImageUrl(s) {
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|$)/i.test(s);
}
function addAsset(url, path, kind) {
  if (seenAssetUrls.has(url)) return;
  seenAssetUrls.add(url);
  const usage = path.replace(/^\.+/, '');
  const entry = { url, kind, usage };
  if (kind === 'per-brand-source') {
    entry.sourceBrand = brand;
    entry.rewriteTo = url.replace('/assets/brands/' + brand + '/', '/assets/brands/<TARGET_BRAND>/');
  }
  assets.push(entry);
}

const variantsUsed = [];
const seenVariants = new Set();
for (const sec of page.sections) {
  if (sec && typeof sec.variant === 'string' && sec.variant) {
    const key = sec.type + ':' + sec.variant;
    if (!seenVariants.has(key)) { seenVariants.add(key); variantsUsed.push({ type: sec.type, variant: sec.variant }); }
  }
}

const sectionTypesPresent = new Set(page.sections.map((s) => s && s.type).filter(Boolean));
const addonsRecommended = [];
for (const t of sectionTypesPresent) {
  if (ADDON_HINTS[t]) for (const a of ADDON_HINTS[t]) if (!addonsRecommended.includes(a)) addonsRecommended.push(a);
}

let sectionOverrides = [];
const ovPath = join(contentRoot, 'section-overrides.json');
if (existsSync(ovPath)) {
  try {
    const map = JSON.parse(readFileSync(ovPath, 'utf-8'));
    if (map && typeof map === 'object' && Array.isArray(map[page.path])) sectionOverrides = map[page.path];
  } catch { /* malformed override file is not export-blocking */ }
}

const editorVersion = parseEditorVersion(projectRoot);

const deps = { services, work, testimonials, faqs };
const checksum = createHash('sha256').update(canonicalize({ page, deps })).digest('hex');

const bundle = {
  bundleVersion: 1,
  exportedAt: new Date().toISOString(),
  exportedBy: 'scripts/export-page.mjs' + (editorVersion ? '@editor-' + editorVersion : ''),
  source: { brand, slug, path: page.path, shape: pageShape },
  page,
  deps,
  sectionOverrides,
  assets,
  compat: {
    variantsUsed,
    addonsRecommended,
    internalHrefs: Array.from(internalHrefs).sort(),
  },
  checksum,
};

const outputJson = JSON.stringify(bundle, null, 2);
if (args.stdout) {
  process.stdout.write(outputJson);
  process.stdout.write('\n');
} else {
  const outputPath = args.output || join(projectRoot, 'out', `${brand}-${slug}-bundle.json`);
  if (existsSync(outputPath) && !args.overwrite) {
    console.error(`export-page: refusing to overwrite ${outputPath}; pass --overwrite to replace.`);
    process.exit(1);
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, outputJson + '\n');
  const rel = outputPath.startsWith(projectRoot) ? outputPath.slice(projectRoot.length + 1).replace(/\\/g, '/') : outputPath;
  console.log(`export-page: wrote ${rel}`);
  console.log(`  brand=${brand} slug=${slug} path=${page.path} shape=${pageShape}`);
  console.log(`  sections=${page.sections.length} services=${Object.keys(services).length} work=${Object.keys(work).length} testimonials=${testimonials.length} faqs=${faqs.items.length}+groups${faqs.groups.length}`);
  const counts = { external: 0, 'per-brand-source': 0, 'build-asset': 0, unknown: 0 };
  for (const a of assets) counts[a.kind] = (counts[a.kind] || 0) + 1;
  console.log(`  assets=${assets.length} (external=${counts.external}, per-brand-source=${counts['per-brand-source']}, build-asset=${counts['build-asset']}, unknown=${counts.unknown})`);
  console.log(`  internalHrefs=${internalHrefs.size} variantsUsed=${variantsUsed.length} addonsRecommended=${addonsRecommended.length} overrides=${sectionOverrides.length}`);
  console.log(`  checksum=${checksum.slice(0, 16)}…`);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--stdout') out.stdout = true;
    else if (a === '--overwrite') out.overwrite = true;
    else if (a === '--output') out.output = argv[++i];
    else if (a.startsWith('--output=')) out.output = a.slice('--output='.length);
    else if (!a.startsWith('--')) out._.push(a);
  }
  return out;
}
