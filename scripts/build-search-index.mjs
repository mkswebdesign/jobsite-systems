#!/usr/bin/env node
/**
 * Emit dist/search.json for the active brand's published posts.
 *
 * Each entry: { id, title, url, excerpt, category, categoryName, tags, date, body }.
 * `body` is plain text — markdown formatting stripped — so MiniSearch's
 * fuzzy/prefix matching has full-text recall and excerpts can highlight
 * matched terms with <mark>.
 *
 * Brands without a posts/ directory emit []. The /search/ page fetches the
 * file once on load and falls through to "0 articles" when empty.
 *
 * Wiring: in scripts/run-build.mjs, runs after prune-dist alongside
 * build-redirects (so prune doesn't delete the file).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const brand = process.env.BRAND;
if (!brand) {
  console.error('build-search-index: BRAND env var is required');
  process.exit(1);
}

const brandRoot = join(projectRoot, '..', 'arich-source', 'content', 'brands', brand);
const postsDir = join(brandRoot, 'posts');
const categoriesPath = join(brandRoot, 'categories.json');
const distRoot = join(projectRoot, 'dist');

if (!existsSync(distRoot)) {
  console.error(`build-search-index: dist/ not found at ${distRoot} — astro build must run first`);
  process.exit(1);
}

let categoryNames = new Map();
if (existsSync(categoriesPath)) {
  try {
    const j = JSON.parse(readFileSync(categoriesPath, 'utf-8'));
    categoryNames = new Map((j.categories ?? []).map((c) => [c.id, c.name]));
  } catch {
    /* fall through with empty map */
  }
}

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`+/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*>\s*/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const entries = [];
const now = Date.now();
if (existsSync(postsDir)) {
  for (const file of readdirSync(postsDir)) {
    if (!file.endsWith('.md')) continue;
    const raw = readFileSync(join(postsDir, file), 'utf-8');
    let parsed;
    try {
      parsed = matter(raw);
    } catch {
      continue;
    }
    const fm = parsed.data ?? {};
    if (fm.status !== 'published') continue;
    /* Drip-publish gate: skip posts whose publishAt is still in the future. */
    if (fm.publishAt && +new Date(fm.publishAt) > now) continue;
    const slug = fm.slug ?? basename(file, '.md');
    const dateStr = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : String(fm.date ?? '').slice(0, 10);
    const bodyText = stripMarkdown(parsed.content ?? '');
    /* Reading time precomputed here so /archive/ can filter by it client-side
     * without loading every post body. WPM matches src/builder/lib/posts.ts. */
    const readingMinutes = Math.max(1, Math.ceil(bodyText.split(/\s+/).filter(Boolean).length / 220));
    entries.push({
      id: slug,
      title: fm.title ?? slug,
      url: `/post/${slug}/`,
      excerpt: fm.excerpt ?? '',
      category: fm.category ?? '',
      categoryName: categoryNames.get(fm.category) ?? fm.category ?? '',
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      author: fm.author ?? '',
      coverSrc: fm.cover?.src ?? '',
      coverAlt: fm.cover?.alt ?? '',
      date: dateStr,
      readingMinutes,
      body: bodyText,
    });
  }
  /* Newest first so an unindexed iteration also has reasonable order. */
  entries.sort((a, b) => b.date.localeCompare(a.date));
}

mkdirSync(distRoot, { recursive: true });
writeFileSync(join(distRoot, 'search.json'), JSON.stringify(entries));

const sizeKb = Math.round(JSON.stringify(entries).length / 1024 * 10) / 10;
console.log(`build-search-index: ${brand} emitted dist/search.json — ${entries.length} entries (${sizeKb} KB)`);
