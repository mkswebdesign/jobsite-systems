#!/usr/bin/env node
/**
 * Structural validation for a brand's content repo. Catches the failure
 * modes that cause Astro build errors — especially the ones that surface
 * when transplanting a page from one brand to another (missing section
 * files, dangling serviceSlugs / workSlugs / testimonialIds / faqIds).
 *
 * This does NOT re-run Zod validation — Astro will do that during build.
 * It exists to fail fast with clear messages before a real build burns time.
 *
 * Usage:
 *   node scripts/validate-brand.mjs --brand <id>
 *   BRAND=<id> node scripts/validate-brand.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

/* Section types are derived from src/builder/lib/sections.ts SECTION_REGISTRY
 * (Round 2 13B added all 16 union members to the registry; Phase 4 (this) makes
 * validate-brand the first non-audit consumer). The hardcoded Set that used to
 * live here was the duplication this is removing — `audit-sections.mjs`'s
 * registry cross-check guarantees the registry covers every Zod union member. */
const KNOWN_SECTION_TYPES = loadSectionTypesFromRegistry();

const args = parseArgs(process.argv.slice(2));
const brand = args.brand || process.env.BRAND;
if (!brand) {
  console.error('missing required --brand <id> or BRAND env var');
  process.exit(1);
}

const contentDir = resolve(projectRoot, '..', 'arich-source', 'content', 'brands', brand);
const pagesDir = join(contentDir, 'pages');

if (!existsSync(contentDir)) {
  console.error(`brand content dir not found: ${contentDir}`);
  process.exit(1);
}

const errors = [];
const warnings = [];

const { letterRe: VARIANT_LETTER_RE, kebabRe: VARIANT_KEBAB_RE } = await loadVariantConstants();
const VARIANT_KEY_RE = /^[a-z][a-z0-9-]{0,31}$/;

const serviceSlugs = await collectSlugs(join(contentDir, 'services'));
const workSlugs = await collectSlugs(join(contentDir, 'work'));
const testimonialIds = await collectIds(join(contentDir, 'testimonials.json'));
const { faqIds, groupIds } = await collectFaqIds(join(contentDir, 'faq.json'));

await validateBrandJson();

if (!existsSync(pagesDir)) {
  warnings.push(`no pages/ dir for brand=${brand}`);
} else {
  const entries = await readdir(pagesDir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      await validateFolderPage(e.name);
    } else if (e.isFile() && e.name.endsWith('.json')) {
      const slug = e.name.replace(/\.json$/, '');
      await validateFlatPage(slug, join(pagesDir, e.name));
    }
  }
}

if (warnings.length) {
  console.log('warnings:');
  warnings.forEach((w) => console.log(`  ${w}`));
}
if (errors.length) {
  console.error(`\n${errors.length} error(s) in brand=${brand}:`);
  errors.forEach((e) => console.error(`  ${e}`));
  process.exit(1);
}
console.log(`validate-brand: brand=${brand} ok (pages=${await countPages()} services=${serviceSlugs.size} work=${workSlugs.size} testimonials=${testimonialIds.size} faqs=${faqIds.size})`);

async function validateFolderPage(slug) {
  const pageJsonPath = join(pagesDir, slug, 'page.json');
  if (!existsSync(pageJsonPath)) {
    errors.push(`pages/${slug}/ exists but has no page.json`);
    return;
  }
  const page = await readJson(pageJsonPath, `pages/${slug}/page.json`);
  if (!page) return;

  requireField(page, 'slug', `pages/${slug}/page.json`);
  requireField(page, 'path', `pages/${slug}/page.json`);

  if (Array.isArray(page.sections)) {
    for (let i = 0; i < page.sections.length; i++) {
      const entry = page.sections[i];
      if (typeof entry === 'string') {
        const secPath = resolve(join(pagesDir, slug), entry);
        const rel = relative(join(pagesDir, slug), secPath);
        if (rel.startsWith('..') || isAbsolute(rel)) {
          errors.push(`pages/${slug}/page.json sections[${i}]: reference escapes page folder: '${entry}'`);
          continue;
        }
        if (!existsSync(secPath)) {
          errors.push(`pages/${slug}/page.json sections[${i}]: missing file '${entry}'`);
          continue;
        }
        const section = await readJson(secPath, `pages/${slug}/${entry}`);
        if (section) validateSection(section, `pages/${slug}/${entry}`);
      } else if (entry && typeof entry === 'object') {
        validateSection(entry, `pages/${slug}/page.json sections[${i}]`);
      } else {
        errors.push(`pages/${slug}/page.json sections[${i}]: not a string or object`);
      }
    }
  }
}

async function validateFlatPage(slug, filePath) {
  const page = await readJson(filePath, `pages/${slug}.json`);
  if (!page) return;
  requireField(page, 'slug', `pages/${slug}.json`);
  requireField(page, 'path', `pages/${slug}.json`);
  if (Array.isArray(page.sections)) {
    page.sections.forEach((section, i) => {
      if (section && typeof section === 'object') {
        validateSection(section, `pages/${slug}.json sections[${i}]`);
      }
    });
  }
}

function validateSection(section, where) {
  if (!section || typeof section !== 'object') {
    errors.push(`${where}: not an object`);
    return;
  }
  const type = section.type;
  if (typeof type !== 'string') {
    errors.push(`${where}: missing 'type' string`);
    return;
  }
  if (!KNOWN_SECTION_TYPES.has(type)) {
    errors.push(`${where}: unknown section type '${type}' (known: ${[...KNOWN_SECTION_TYPES].join(', ')})`);
    return;
  }

  if (type === 'services' && Array.isArray(section.serviceSlugs)) {
    for (const s of section.serviceSlugs) {
      if (!serviceSlugs.has(s)) errors.push(`${where}: serviceSlug '${s}' not in content/brands/${brand}/services/`);
    }
  }
  if (type === 'work' && Array.isArray(section.workSlugs)) {
    for (const s of section.workSlugs) {
      if (!workSlugs.has(s)) errors.push(`${where}: workSlug '${s}' not in content/brands/${brand}/work/`);
    }
  }
  if (type === 'testimonials' && Array.isArray(section.testimonialIds)) {
    for (const id of section.testimonialIds) {
      if (!testimonialIds.has(id)) errors.push(`${where}: testimonialId '${id}' not in testimonials.json`);
    }
  }
  if (type === 'faq') {
    if (Array.isArray(section.faqIds)) {
      for (const id of section.faqIds) {
        if (!faqIds.has(id)) errors.push(`${where}: faqId '${id}' not in faq.json`);
      }
    }
    if (Array.isArray(section.groupIds)) {
      for (const id of section.groupIds) {
        if (!groupIds.has(id)) errors.push(`${where}: groupId '${id}' not in faq.json`);
      }
    }
  }
}

async function collectSlugs(dir) {
  const out = new Set();
  if (!existsSync(dir)) return out;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.json')) continue;
    const slug = e.name.replace(/\.json$/, '');
    out.add(slug);
    const data = await readJson(join(dir, e.name), e.name);
    if (data && typeof data.slug === 'string') out.add(data.slug);
  }
  return out;
}

async function collectIds(filePath) {
  const out = new Set();
  if (!existsSync(filePath)) return out;
  const data = await readJson(filePath, filePath);
  if (!data) return out;
  const arr = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  for (const item of arr) {
    if (item && typeof item.id === 'string') out.add(item.id);
  }
  return out;
}

async function collectFaqIds(filePath) {
  const faqIds = new Set();
  const groupIds = new Set();
  if (!existsSync(filePath)) return { faqIds, groupIds };
  const data = await readJson(filePath, filePath);
  if (!data) return { faqIds, groupIds };
  const groups = Array.isArray(data) ? data : Array.isArray(data.groups) ? data.groups : [];
  for (const group of groups) {
    if (group && typeof group.id === 'string') groupIds.add(group.id);
    const items = Array.isArray(group?.faqs)
      ? group.faqs
      : Array.isArray(group?.items)
        ? group.items
        : [];
    for (const item of items) {
      if (item && typeof item.id === 'string') faqIds.add(item.id);
    }
  }
  const flat = Array.isArray(data?.faqs)
    ? data.faqs
    : Array.isArray(data?.items)
      ? data.items
      : [];
  for (const item of flat) {
    if (item && typeof item.id === 'string') faqIds.add(item.id);
  }
  return { faqIds, groupIds };
}

async function readJson(filePath, label) {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    errors.push(`${label}: ${err.message}`);
    return null;
  }
}

function requireField(obj, field, where) {
  if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
    errors.push(`${where}: missing required field '${field}'`);
  }
}

async function countPages() {
  if (!existsSync(pagesDir)) return 0;
  const entries = await readdir(pagesDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() || (e.isFile() && e.name.endsWith('.json'))).length;
}

async function validateBrandJson() {
  const brandJsonPath = join(contentDir, 'brand.json');
  if (!existsSync(brandJsonPath)) {
    errors.push(`brand.json: missing at ${brandJsonPath}`);
    return;
  }
  const data = await readJson(brandJsonPath, 'brand.json');
  if (!data) return;
  if (data.defaultVariants !== undefined && data.defaultVariants !== null) {
    if (typeof data.defaultVariants !== 'object' || Array.isArray(data.defaultVariants)) {
      errors.push(`brand.json: 'defaultVariants' must be an object map`);
    } else {
      for (const [k, v] of Object.entries(data.defaultVariants)) {
        if (!VARIANT_KEY_RE.test(k)) {
          errors.push(`brand.json: defaultVariants key '${k}' must match ${VARIANT_KEY_RE.source} (used as data-<name>-variant attribute on <html>)`);
          continue;
        }
        if (typeof v !== 'string' || !v) {
          errors.push(`brand.json: defaultVariants['${k}'] must be a non-empty string`);
          continue;
        }
        if (!VARIANT_LETTER_RE.test(v) && !VARIANT_KEBAB_RE.test(v)) {
          errors.push(`brand.json: defaultVariants['${k}']='${v}' is not a letter (${VARIANT_LETTER_RE.source}) or kebab token (${VARIANT_KEBAB_RE.source}) — Base.astro will silently drop it`);
        }
      }
    }
  }
}

function loadSectionTypesFromRegistry() {
  const registryPath = resolve(projectRoot, 'src', 'builder', 'lib', 'sections.ts');
  if (!existsSync(registryPath)) {
    console.error(`validate-brand: missing src/builder/lib/sections.ts at ${registryPath}; cannot resolve KNOWN_SECTION_TYPES`);
    process.exit(1);
  }
  const src = readFileSync(registryPath, 'utf-8');
  const arrMatch = src.match(/SECTION_REGISTRY[^=]*=\s*\[([\s\S]*?)\]\s*;/);
  if (!arrMatch) {
    console.error(`validate-brand: cannot parse SECTION_REGISTRY array from sections.ts`);
    process.exit(1);
  }
  const out = new Set();
  const objRe = /\{([^{}]+)\}/g;
  let m;
  while ((m = objRe.exec(arrMatch[1]))) {
    const fields = {};
    for (const fm of m[1].matchAll(/(\w+)\s*:\s*['"]([^'"]+)['"]/g)) fields[fm[1]] = fm[2];
    if (fields.type) out.add(fields.type);
  }
  if (out.size === 0) {
    console.error(`validate-brand: parsed 0 entries from SECTION_REGISTRY; sections.ts shape may have drifted`);
    process.exit(1);
  }
  return out;
}

async function loadVariantConstants() {
  const variantsTs = resolve(projectRoot, 'src', 'builder', 'lib', 'variants.ts');
  if (!existsSync(variantsTs)) {
    errors.push(`missing src/builder/lib/variants.ts — cannot validate defaultVariants`);
    return { letterRe: /^[A-H]$/, kebabRe: /^[a-z0-9][a-z0-9-]{0,31}$/ };
  }
  const src = await readFile(variantsTs, 'utf-8');
  const maxLetter = src.match(/MAX_VARIANT_LETTER\s*=\s*['"]([A-Z])['"]/)?.[1] ?? 'H';
  const kebab = src.match(/VARIANT_KEBAB_RE_SOURCE\s*=\s*['"]([^'"]+)['"]/)?.[1] ?? '^[a-z0-9][a-z0-9-]{0,31}$';
  return { letterRe: new RegExp(`^[A-${maxLetter}]$`), kebabRe: new RegExp(kebab) };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}
