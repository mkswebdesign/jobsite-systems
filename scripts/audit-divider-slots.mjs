#!/usr/bin/env node
/**
 * Audit: every `dividers[].after` value declared in any brand's page.json
 * must have a matching `<DividerSlot dividers={d.dividers} after="<key>" />`
 * call in the corresponding page template at src/pages/<slug>.astro.
 *
 * Why this matters — when a brand's content adds a divider entry pointing
 * at a slot the page template doesn't expose, the entry silently no-ops.
 * Same friction in reverse: a page template that wires DividerSlot for a
 * slot no brand uses is harmless but smells like dead code worth
 * documenting.
 *
 * Two reports:
 *   1. ORPHAN entries — page.json declares `dividers[].after = "X"` but
 *      no DividerSlot with `after="X"` exists in the page template.
 *      These are the active bugs (silent no-op divider entries).
 *   2. UNUSED slots — page template wires `<DividerSlot after="X" />` but
 *      no brand has a `dividers` entry targeting that slot. Dead-ish, but
 *      flagged so reorganizing the template can be informed.
 *
 * Page mapping:
 *   page.json `path` = "/about/"   → template src/pages/about.astro
 *   page.json `path` = "/services/" → template src/pages/services.astro
 *   ...etc. Compositional pages (page.json with `sections[]`) are skipped
 *   since dividers there ride as `divider` section types in the array
 *   rather than via the DividerSlot helper.
 *
 * Exits 0 with "all wired" when clean, 1 with both report sections when
 * any orphans are found. UNUSED slots are warnings only — they don't
 * trip the exit code (templates legitimately expose slots no brand has
 * staged a divider for yet).
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = join(projectRoot, '..', 'arich-source', 'content', 'brands');
const pagesRoot = join(projectRoot, 'src', 'pages');

const rel = (p) => relative(projectRoot, p).replace(/\\/g, '/');

// Collect (brand, pagePath, dividers, pagejsonPath) from every brand's
// pages folder.
async function collectDividerEntries() {
  const out = [];
  if (!existsSync(sourceRoot)) {
    console.error(`audit-divider-slots: source root missing — ${rel(sourceRoot)}`);
    process.exit(1);
  }
  const brands = (await readdir(sourceRoot)).filter((b) => !b.startsWith('_'));
  for (const brand of brands) {
    const brandPagesDir = join(sourceRoot, brand, 'pages');
    if (!existsSync(brandPagesDir)) continue;
    const slugs = await readdir(brandPagesDir);
    for (const slug of slugs) {
      const pageJsonPath = join(brandPagesDir, slug, 'page.json');
      if (!existsSync(pageJsonPath)) continue;
      let data;
      try { data = JSON.parse(await readFile(pageJsonPath, 'utf-8')); }
      catch { continue; }
      if (!Array.isArray(data.dividers) || !data.dividers.length) continue;
      // Skip compositional pages — their dividers ride in sections[].
      if (Array.isArray(data.sections) && data.sections.length) continue;
      out.push({
        brand,
        path: data.path || `/${slug}/`,
        slug,
        dividers: data.dividers,
        pageJsonPath,
      });
    }
  }
  return out;
}

// Resolve a page.json `path` to its template file. /about/ → about.astro.
// Templates under nested dirs (e.g., /services/<slug>/) are checked too
// via [slug].astro pattern.
function resolveTemplate(pathStr) {
  const trimmed = pathStr.replace(/^\/|\/$/g, '');
  if (!trimmed) return join(pagesRoot, 'index.astro');
  // Try direct .astro first.
  const direct = join(pagesRoot, trimmed + '.astro');
  if (existsSync(direct)) return direct;
  // Try as a folder with index.astro.
  const folderIndex = join(pagesRoot, trimmed, 'index.astro');
  if (existsSync(folderIndex)) return folderIndex;
  return null;
}

function extractDividerSlotKeys(astroSrc) {
  const keys = new Set();
  const re = /<DividerSlot[^>]*\bafter\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(astroSrc)) !== null) keys.add(m[1]);
  return keys;
}

const entries = await collectDividerEntries();

const orphans = []; // { brand, pagePath, after, templatePath? }
const unused = [];  // { templatePath, slotKey, brands: string[] }

// Aggregate: which slots does each template expose, which slots are
// referenced by any brand, then diff.
const templateSlots = new Map();   // templatePath → Set<slotKey>
const referencedSlots = new Map(); // templatePath → Map<slotKey, Set<brand>>

for (const entry of entries) {
  const template = resolveTemplate(entry.path);
  if (!template) {
    for (const d of entry.dividers) {
      orphans.push({ brand: entry.brand, pagePath: entry.path, after: d.after, templatePath: '(template not found)' });
    }
    continue;
  }
  if (!templateSlots.has(template)) {
    templateSlots.set(template, extractDividerSlotKeys(await readFile(template, 'utf-8')));
  }
  if (!referencedSlots.has(template)) referencedSlots.set(template, new Map());
  const slots = templateSlots.get(template);
  const refMap = referencedSlots.get(template);
  for (const d of entry.dividers) {
    if (!d || typeof d.after !== 'string') continue;
    if (!refMap.has(d.after)) refMap.set(d.after, new Set());
    refMap.get(d.after).add(entry.brand);
    if (!slots.has(d.after)) {
      orphans.push({ brand: entry.brand, pagePath: entry.path, after: d.after, templatePath: rel(template) });
    }
  }
}

for (const [template, slots] of templateSlots) {
  const refMap = referencedSlots.get(template) ?? new Map();
  for (const slotKey of slots) {
    if (!refMap.has(slotKey)) {
      unused.push({ templatePath: rel(template), slotKey, brands: [] });
    }
  }
}

// Output.
let exitCode = 0;
if (orphans.length) {
  exitCode = 1;
  console.error(`audit-divider-slots: ${orphans.length} ORPHAN entrie(s) — page.json dividers with no matching <DividerSlot> in the template:`);
  for (const o of orphans) {
    console.error(`  ${o.brand} ${o.pagePath} after="${o.after}" → ${o.templatePath}`);
  }
  console.error(`\nFix — add a slot to the template, e.g.:`);
  console.error(`  <DividerSlot dividers={d.dividers} after="<key>" />`);
  console.error(`...placed at the boundary the user expects the divider to render.\n`);
}
if (unused.length) {
  console.warn(`audit-divider-slots: ${unused.length} UNUSED slot(s) — wired in template but no brand uses them (informational, not an error):`);
  for (const u of unused) console.warn(`  ${u.templatePath} after="${u.slotKey}"`);
  console.warn('');
}
if (!orphans.length && !unused.length) {
  console.log('audit-divider-slots: all DividerSlot calls match brand dividers entries (and vice versa).');
}
process.exit(exitCode);
