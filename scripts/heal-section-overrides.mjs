#!/usr/bin/env node
/**
 * Self-heal section-overrides.json against the brand's current page JSONs.
 *
 * Why: section-overrides rows are keyed by { type, index } where index is
 * "0-based ordinal among same-type sections in DOM order". When the user
 * removes an earlier same-type section the indices of later siblings shift
 * by 1, but the committed file doesn't know — so the override row at the
 * old index is now applied to a different section's content.
 *
 * Each row carries an optional `sectionHeading` snapshot. This healer:
 *   - For sectional pages (page JSON with a `sections` array), uses the
 *     heading to locate the row's true target and rewrites `index` to match
 *     the section's current ordinal-among-same-type. Rows whose heading no
 *     longer matches any live section get dropped (with a warning).
 *   - Backfills `sectionHeading` on rows that don't have one yet by reading
 *     the section currently at {type, index} and snapshotting its heading.
 *   - For non-sectional pages (hardcoded astro files like /faq/, /contact/),
 *     leaves rows alone — runtime DOM-heading resolution in Base.astro
 *     handles drift on those.
 *   - For wildcard paths (e.g. /services/*, /work/*) — same treatment as
 *     non-sectional: leave alone, runtime resolver handles drift.
 *
 * Usage:
 *   node scripts/heal-section-overrides.mjs            # heals current BRAND
 *   node scripts/heal-section-overrides.mjs --dry      # report only, no writes
 *
 * Wired into run-build.mjs so every build leaves section-overrides.json
 * consistent with the page JSONs it ships against.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const contentRoot = join(projectRoot, '..', 'arich-source', 'content');

const BRAND = process.env.BRAND || 'arich';
const DRY = process.argv.includes('--dry');

const brandDir = join(contentRoot, 'brands', BRAND);
const overridesFile = join(brandDir, 'section-overrides.json');

if (!existsSync(overridesFile)) {
  console.log(`heal-section-overrides: no section-overrides.json for brand=${BRAND} — skipping`);
  process.exit(0);
}

function normalizeHeading(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
}

// section-overrides rows store types in kebab-case (matches DOM
// `data-section-type`), but page JSON `type` fields use camelCase to
// match the section registry. Convert both to a canonical kebab form
// for comparison.
function toKebab(s) {
  return String(s || '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Pull a heading-ish field from a section JSON object. Most section types
// use `heading`; hero uses `headline`. Fall back to empty string.
function sectionHeading(section) {
  if (!section || typeof section !== 'object') return '';
  if (typeof section.heading === 'string' && section.heading.trim()) return section.heading.trim();
  if (typeof section.headline === 'string' && section.headline.trim()) return section.headline.trim();
  return '';
}

// Resolve `path` (e.g. "/" or "/partnership/") to the page JSON file that
// drives it, or null when the path is non-sectional / wildcard / hardcoded.
function resolvePageFile(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return null;
  if (path.includes('*')) return null; // wildcard group — handled at runtime
  // Trim leading and trailing slash, then map "/" → "home", "/partnership/" → "partnership"
  let slug = path.replace(/^\/+|\/+$/g, '');
  if (!slug) slug = 'home';
  // Only single-segment paths map cleanly to pages/<slug>.json. Nested paths
  // (e.g. /services/wordpress-website-design/) live in services/<slug>.json,
  // which doesn't have a `sections` array — return null and let runtime handle.
  if (slug.includes('/')) return null;
  const flat = join(brandDir, 'pages', slug + '.json');
  if (existsSync(flat)) return flat;
  // Folder format: pages/<slug>/page.json
  const folder = join(brandDir, 'pages', slug, 'page.json');
  if (existsSync(folder)) return folder;
  return null;
}

// Build [{ type, heading, ordinal }] from a sectional page's `sections`.
// `ordinal` is 0-based among same-type entries (matches DOM walk).
//
// Handles both authoring formats:
//   - Flat: sections is [{ type, heading, ... }, ...] (inline objects)
//   - Folder: sections is ["sections/01-hero.json", ...] (path refs to per-
//     section files in the same folder); may also be mixed with inline
//     objects for trivial sections like dividers.
// `pageDir` is the directory of the page file, used to resolve refs.
function indexPageSections(sectionsArr, pageDir) {
  if (!Array.isArray(sectionsArr)) return [];
  const seen = {};
  const out = [];
  for (const entry of sectionsArr) {
    let s = null;
    if (entry && typeof entry === 'object') {
      s = entry;
    } else if (typeof entry === 'string') {
      const refPath = join(pageDir, entry);
      if (!existsSync(refPath)) continue;
      try { s = JSON.parse(readFileSync(refPath, 'utf-8')); }
      catch { continue; }
    }
    if (!s || typeof s.type !== 'string') continue;
    const kebabType = toKebab(s.type);
    const ordinal = seen[kebabType] || 0;
    seen[kebabType] = ordinal + 1;
    out.push({ type: kebabType, heading: sectionHeading(s), ordinal });
  }
  return out;
}

const raw = readFileSync(overridesFile, 'utf-8');
let parsed;
try { parsed = JSON.parse(raw); }
catch (e) { console.error(`heal-section-overrides: ${overridesFile} is not valid JSON: ${e.message}`); process.exit(1); }

const out = {};
let changed = 0;
let backfilled = 0;
let rebased = 0;
let dropped = 0;

for (const [path, rows] of Object.entries(parsed)) {
  if (!Array.isArray(rows) || !rows.length) continue;
  const pageFile = resolvePageFile(path);
  // Non-sectional / wildcard — pass through unchanged.
  if (!pageFile) {
    out[path] = rows;
    continue;
  }
  let pageData;
  try { pageData = JSON.parse(readFileSync(pageFile, 'utf-8')); }
  catch (e) {
    console.warn(`heal-section-overrides: ${path} → ${pageFile} parse error (${e.message}); leaving rows alone`);
    out[path] = rows;
    continue;
  }
  if (!Array.isArray(pageData.sections)) {
    out[path] = rows;
    continue;
  }
  const live = indexPageSections(pageData.sections, dirname(pageFile));
  const liveByHeading = new Map();
  for (const e of live) {
    if (e.heading) liveByHeading.set(normalizeHeading(e.heading) + '::' + e.type, e);
  }
  const liveByTypeOrdinal = new Map();
  for (const e of live) liveByTypeOrdinal.set(e.type + '::' + e.ordinal, e);
  // Set of section types that actually appear in the JSON. Used to
  // distinguish "type was removed from this page" (drop the orphan row)
  // from "type is rendered by a hardcoded astro file the healer can't
  // see — e.g. SiteCta on faq.astro emits data-section-type='cta' but
  // never appears in any page JSON." When the type isn't in the JSON
  // at all, leave the row alone and let the runtime DOM-heading
  // resolver handle it.
  const liveTypes = new Set(live.map((e) => e.type));

  const healed = [];
  for (const r of rows) {
    if (!r || typeof r.type !== 'string' || !Number.isFinite(r.index)) continue;
    const rType = toKebab(r.type);
    const rh = normalizeHeading(r.sectionHeading || '');
    // Type doesn't appear in this page's JSON section list at all —
    // probably rendered by a hardcoded astro file. Preserve the row
    // unchanged; runtime resolver handles drift on those.
    if (!liveTypes.has(rType)) {
      healed.push(r);
      continue;
    }
    let target = null;
    // Heading-first match
    if (rh) {
      const hit = liveByHeading.get(rh + '::' + rType);
      if (hit) target = hit;
    }
    // Index fallback (no heading on row, or heading didn't match anything live)
    if (!target && !rh) {
      const hit = liveByTypeOrdinal.get(rType + '::' + r.index);
      if (hit) target = hit;
    }
    if (!target) {
      console.warn(`heal-section-overrides: ${path} ${r.type}#${r.index}${rh ? ` "${r.sectionHeading}"` : ''} → no live match; dropping`);
      dropped++;
      changed++;
      continue;
    }
    const newRow = { ...r };
    if (newRow.index !== target.ordinal) {
      console.log(`heal-section-overrides: ${path} ${r.type}#${r.index} → #${target.ordinal} (heading "${target.heading}")`);
      newRow.index = target.ordinal;
      rebased++;
      changed++;
    }
    if (!newRow.sectionHeading && target.heading) {
      newRow.sectionHeading = target.heading;
      backfilled++;
      changed++;
    }
    healed.push(newRow);
  }
  if (healed.length) out[path] = healed;
}

// Preserve key order so diff stays minimal.
const orderedOut = {};
for (const k of Object.keys(parsed)) if (out[k]) orderedOut[k] = out[k];
for (const k of Object.keys(out)) if (!(k in orderedOut)) orderedOut[k] = out[k];

if (!changed) {
  console.log(`heal-section-overrides: brand=${BRAND} ok — no drift`);
  process.exit(0);
}
if (DRY) {
  console.log(`heal-section-overrides: brand=${BRAND} would change ${changed} row(s) — rebased=${rebased}, backfilled=${backfilled}, dropped=${dropped} (--dry, not written)`);
  process.exit(0);
}
writeFileSync(overridesFile, JSON.stringify(orderedOut, null, 2) + '\n', 'utf-8');
console.log(`heal-section-overrides: brand=${BRAND} healed — rebased=${rebased}, backfilled=${backfilled}, dropped=${dropped}`);
