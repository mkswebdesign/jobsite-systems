#!/usr/bin/env node
/**
 * Merges a downloaded `section-overrides.json` (from the in-page editor's
 * Tools → "Save section overrides" button) into the brand's committed file
 * at `arich-source/content/brands/<brand>/section-overrides.json`.
 *
 * Usage:
 *   node scripts/apply-section-overrides.mjs <input.json> [BRAND]
 *
 * BRAND defaults to $BRAND or "arich". Omit the input path to read from
 * stdin (pipe the section-overrides section of a copy-patch through `jq`).
 *
 * Merge rules (same keying as the restore script in Base.astro):
 *   - rows keyed by (pathname, type, index)
 *   - incoming row replaces committed row for that key
 *   - an incoming row with no overrides (all fields empty) *removes*
 *     the committed row for that key
 *   - untouched pathnames/rows in the existing file are preserved
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const contentRoot = join(projectRoot, '..', 'arich-source', 'content');

const args = process.argv.slice(2);
const inputPath = args[0] && !args[0].startsWith('--') ? args[0] : null;
const brand = (args.find((a) => !a.startsWith('--') && a !== inputPath)) || process.env.BRAND || 'arich';

function readStdin() {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (c) => (buf += c));
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}

function isNonEmptyRow(r) {
  return r && (r.theme || r.accent || r.parallax || r.parallaxUrl || r.disabled);
}

function normalizeRow(r) {
  if (!r || typeof r.type !== 'string' || !Number.isFinite(r.index)) return null;
  const out = { type: r.type, index: r.index };
  // sectionHeading is a sticky identity tag — preserved so the runtime
  // resolver can survive index drift when the user deletes an earlier
  // same-type section.
  if (typeof r.sectionHeading === 'string' && r.sectionHeading.trim()) out.sectionHeading = r.sectionHeading.trim();
  if (['light', 'dark', 'white', 'black', 'primary', 'secondary', 'vibrant'].includes(r.theme)) out.theme = r.theme;
  if (typeof r.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.accent)) out.accent = r.accent.toLowerCase();
  if (r.parallax === 'on') out.parallax = 'on';
  if (typeof r.parallaxUrl === 'string' && /^https?:\/\//.test(r.parallaxUrl)) out.parallaxUrl = r.parallaxUrl;
  if (r.disabled === 'on') out.disabled = 'on';
  return out;
}

function rowKey(r) {
  return `${r.type}::${r.index}`;
}

async function main() {
  const raw = inputPath ? readFileSync(inputPath, 'utf-8') : await readStdin();
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { console.error('Input is not valid JSON:', e.message); process.exit(1); }

  // Accept either a bare `{ "<path>": [...] }` shape or a full copy-patch
  // payload with a `sectionOverrides` key.
  const incoming = parsed && typeof parsed === 'object' && parsed.sectionOverrides && typeof parsed.sectionOverrides === 'object'
    ? parsed.sectionOverrides
    : parsed;
  if (!incoming || typeof incoming !== 'object') {
    console.error('Input must be a map of pathname → row[] (or a copy-patch with a sectionOverrides block).');
    process.exit(1);
  }

  const brandDir = join(contentRoot, 'brands', brand);
  if (!existsSync(brandDir)) { console.error(`Brand dir not found: ${brandDir}`); process.exit(1); }
  const outFile = join(brandDir, 'section-overrides.json');

  // Load existing committed state (if any).
  let existing = {};
  if (existsSync(outFile)) {
    try { existing = JSON.parse(readFileSync(outFile, 'utf-8')) || {}; }
    catch (e) { console.error(`Existing ${outFile} is not valid JSON — aborting to avoid data loss.`); process.exit(1); }
  }

  let addedOrChanged = 0;
  let removed = 0;
  const merged = {};
  // Seed with existing rows (keyed by pathname → rowKey → row).
  for (const [path, rows] of Object.entries(existing)) {
    if (!Array.isArray(rows)) continue;
    merged[path] = {};
    for (const r of rows) {
      const n = normalizeRow(r);
      if (n && isNonEmptyRow(n)) merged[path][rowKey(n)] = n;
    }
  }
  // Apply incoming rows.
  for (const [path, rows] of Object.entries(incoming)) {
    if (!Array.isArray(rows)) continue;
    if (!merged[path]) merged[path] = {};
    for (const r of rows) {
      const n = normalizeRow(r);
      if (!n) continue;
      const k = rowKey(n);
      if (!isNonEmptyRow(n)) {
        if (merged[path][k]) { delete merged[path][k]; removed++; }
        continue;
      }
      const prev = merged[path][k];
      if (!prev || JSON.stringify(prev) !== JSON.stringify(n)) addedOrChanged++;
      merged[path][k] = n;
    }
  }

  // Flatten to final shape: path → row[] (sorted) — and drop empty pages.
  const out = {};
  for (const [path, map] of Object.entries(merged)) {
    const rows = Object.values(map).sort((a, b) => (a.type || '').localeCompare(b.type || '') || a.index - b.index);
    if (rows.length) out[path] = rows;
  }

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n', 'utf-8');
  const pageCount = Object.keys(out).length;
  const rowCount = Object.values(out).reduce((n, arr) => n + arr.length, 0);
  console.log(`brand: ${brand}`);
  console.log(`wrote: ${outFile}`);
  console.log(`pages: ${pageCount}  rows: ${rowCount}  (+${addedOrChanged} changed, -${removed} removed)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
