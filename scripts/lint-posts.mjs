#!/usr/bin/env node
/**
 * Lint blog post markdown files for a brand.
 *
 * Usage:
 *   node scripts/lint-posts.mjs <brand-id>
 *
 * Scans:
 *   ../arich-source/content/brands/<brand-id>/posts/*.md
 *
 * Validates front-matter against the post schema (title/slug/date/status/category/cover.src/cover.alt
 * required; slug regex + uniqueness + filename match; category exists in categories.json; status enum;
 * excerpt <=200 chars with auto-derive-from-first-paragraph + writeback if missing; date/updated valid
 * ISO 8601; tags array of lowercase-hyphen strings with auto-normalize + writeback; author exists in
 * authors.json; cover image path warn-but-pass when missing on disk).
 *
 * Exit codes:
 *   0 — clean (or only warnings)
 *   1 — validation errors found
 *   2 — usage error or brand has no posts/ (when invoked directly)
 *
 * When the brand has no posts/ directory, exits 0 with a "no posts collection" notice. The brand-lint
 * wrapper only invokes this script when posts/ exists, but we still no-op gracefully if called directly.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const contentRoot = join(projectRoot, '..', 'arich-source', 'content', 'brands');
const publicRoot = join(projectRoot, 'public');

const brandId = process.argv[2];
if (!brandId) {
  console.error('Usage: node scripts/lint-posts.mjs <brand-id>');
  process.exit(2);
}

const brandRoot = join(contentRoot, brandId);
const postsDir = join(brandRoot, 'posts');
const categoriesPath = join(brandRoot, 'categories.json');
const authorsPath = join(brandRoot, 'authors.json');

if (!existsSync(postsDir)) {
  console.log(`lint-posts: ${brandId} has no posts/ directory — skipped.`);
  process.exit(0);
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TAG_RE  = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_RE  = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const STATUSES = new Set(['draft', 'published', 'archived']);

function loadCategorySlugs() {
  if (!existsSync(categoriesPath)) return null;
  try {
    const j = JSON.parse(readFileSync(categoriesPath, 'utf-8'));
    return new Set((j.categories ?? []).map(c => c.id));
  } catch {
    return null;
  }
}

function loadAuthorIds() {
  if (!existsSync(authorsPath)) return null;
  try {
    const j = JSON.parse(readFileSync(authorsPath, 'utf-8'));
    return new Set((j.authors ?? []).map(a => a.id));
  } catch {
    return null;
  }
}

const categorySlugs = loadCategorySlugs();
const authorIds = loadAuthorIds();

const errors = [];   // { file, message }
const warnings = []; // { file, message }

const postFiles = readdirSync(postsDir)
  .filter(f => f.endsWith('.md'))
  .map(f => join(postsDir, f))
  .filter(f => statSync(f).isFile());

const seenSlugs = new Map(); // slug -> first file path

function err(file, message) { errors.push({ file: relPath(file), message }); }
function warn(file, message) { warnings.push({ file: relPath(file), message }); }
function relPath(file) { return file.replace(brandRoot + '\\', '').replace(brandRoot + '/', '').replaceAll('\\', '/'); }

function deriveExcerptFromBody(body) {
  // First non-empty paragraph, stripped of markdown noise.
  const para = (body.split(/\r?\n\s*\r?\n/).map(p => p.trim()).find(p => p && !p.startsWith('#'))) ?? '';
  const cleaned = para
    .replace(/`+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 200 ? cleaned.slice(0, 197).trimEnd() + '…' : cleaned;
}

function normalizeTag(t) {
  return String(t).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

for (const file of postFiles) {
  const filename = basename(file, '.md');
  const raw = readFileSync(file, 'utf-8');
  let parsed;
  try {
    parsed = matter(raw);
  } catch (e) {
    err(file, `front-matter parse failed: ${e.message}`);
    continue;
  }
  const fm = parsed.data ?? {};
  const body = parsed.content ?? '';
  let writeBack = false;

  // Required fields
  for (const k of ['title', 'slug', 'date', 'status', 'category']) {
    if (fm[k] == null || fm[k] === '') err(file, `missing required field: ${k}`);
  }
  if (!fm.cover || typeof fm.cover !== 'object') {
    err(file, `missing required field: cover (object)`);
  } else {
    if (!fm.cover.src) err(file, `missing required field: cover.src`);
    if (!fm.cover.alt) err(file, `missing required field: cover.alt`);
  }

  // slug regex + uniqueness + filename match
  if (typeof fm.slug === 'string') {
    if (!SLUG_RE.test(fm.slug)) err(file, `slug "${fm.slug}" must match ${SLUG_RE}`);
    if (fm.slug !== filename) err(file, `slug "${fm.slug}" does not match filename "${filename}"`);
    if (seenSlugs.has(fm.slug)) {
      err(file, `slug "${fm.slug}" already used by ${relPath(seenSlugs.get(fm.slug))}`);
    } else {
      seenSlugs.set(fm.slug, file);
    }
  }

  // status enum
  if (fm.status != null && !STATUSES.has(fm.status)) {
    err(file, `status "${fm.status}" not in {draft, published, archived}`);
  }

  // category exists
  if (typeof fm.category === 'string' && categorySlugs && !categorySlugs.has(fm.category)) {
    err(file, `category "${fm.category}" not found in categories.json`);
  }

  // author exists
  if (typeof fm.author === 'string' && authorIds && !authorIds.has(fm.author)) {
    err(file, `author "${fm.author}" not found in authors.json`);
  }

  // date / updated ISO 8601
  for (const k of ['date', 'updated']) {
    const v = fm[k];
    if (v == null) continue;
    const s = v instanceof Date ? v.toISOString() : String(v);
    if (!ISO_RE.test(s)) err(file, `${k} "${s}" is not a valid ISO 8601 timestamp`);
  }

  // excerpt: <=200 chars; auto-derive from first paragraph if missing
  if (fm.excerpt == null || fm.excerpt === '') {
    const derived = deriveExcerptFromBody(body);
    if (derived) {
      fm.excerpt = derived;
      writeBack = true;
      warn(file, `auto-derived excerpt (${derived.length} chars) from first paragraph`);
    } else {
      err(file, `missing excerpt and no derivable first paragraph`);
    }
  } else if (typeof fm.excerpt === 'string' && fm.excerpt.length > 200) {
    err(file, `excerpt is ${fm.excerpt.length} chars (max 200)`);
  }

  // tags: array of lowercase-hyphen strings; auto-normalize
  if (fm.tags != null) {
    if (!Array.isArray(fm.tags)) {
      err(file, `tags must be an array`);
    } else {
      const normalized = fm.tags.map(t => normalizeTag(t));
      const changed = normalized.some((t, i) => t !== fm.tags[i]);
      if (changed) {
        fm.tags = normalized;
        writeBack = true;
        warn(file, `normalized tags to ${JSON.stringify(normalized)}`);
      }
      for (const t of fm.tags) {
        if (!TAG_RE.test(t)) err(file, `tag "${t}" must match ${TAG_RE}`);
      }
    }
  }

  // cover image path: warn (don't error) if not on disk under public/
  if (fm.cover?.src && typeof fm.cover.src === 'string' && fm.cover.src.startsWith('/')) {
    const candidate = join(publicRoot, fm.cover.src.slice(1).replaceAll('/', '\\'));
    const candidateAlt = join(publicRoot, fm.cover.src.slice(1));
    if (!existsSync(candidate) && !existsSync(candidateAlt)) {
      warn(file, `cover.src "${fm.cover.src}" not found under public/ — placeholder OK for now`);
    }
  }

  if (writeBack) {
    const newContent = matter.stringify(body, fm);
    writeFileSync(file, newContent);
  }
}

console.log(`lint-posts: ${brandId}`);
console.log(`  ${postFiles.length} post(s) validated`);

if (errors.length > 0) {
  console.log('');
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`  ${e.file}: ${e.message}`);
}

if (warnings.length > 0) {
  console.log('');
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ${w.file}: ${w.message}`);
}

console.log('');
console.log(`summary: ${postFiles.length} posts validated, ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length > 0 ? 1 : 0);
