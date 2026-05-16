#!/usr/bin/env node
/**
 * One-shot, idempotent migration: reshape a brand's flat pages/*.json into
 * the portable per-page folder format.
 *
 *   BEFORE: pages/<slug>.json (with inline sections[] array)
 *   AFTER:  pages/<slug>/page.json   (sections[] = array of string refs)
 *           pages/<slug>/sections/NN-<type>.json  (one per section)
 *
 * Pages without an inline sections array (interior pages using named
 * composition via .passthrough()) are moved wholesale to page.json, with
 * no sections/ folder created.
 *
 * Usage:
 *   node scripts/migrate-pages-to-folders.mjs --brand <id> [--dry-run]
 *
 * Safe to rerun: skips pages that already have a <slug>/page.json. The
 * original <slug>.json is only deleted after a successful write and never
 * deleted in --dry-run mode.
 */
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const args = parseArgs(process.argv.slice(2));
if (!args.brand) {
  console.error('missing required --brand <id>');
  process.exit(1);
}

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pagesDir = resolve(projectRoot, '..', 'arich-source', 'content', 'brands', args.brand, 'pages');

if (!existsSync(pagesDir)) {
  console.error(`pages dir not found: ${pagesDir}`);
  process.exit(1);
}

const dryRun = args['dry-run'] === true;
if (dryRun) console.log('DRY RUN — no files will be written or deleted');

const entries = await readdir(pagesDir, { withFileTypes: true });
const flatFiles = entries
  .filter((e) => e.isFile() && e.name.endsWith('.json'))
  .map((e) => e.name);

let migrated = 0;
let skipped = 0;
let noSections = 0;

for (const file of flatFiles) {
  const slug = file.replace(/\.json$/, '');
  const flatPath = join(pagesDir, file);
  const folderPath = join(pagesDir, slug);
  const pageJsonPath = join(folderPath, 'page.json');

  if (existsSync(folderPath)) {
    const s = await stat(folderPath);
    if (s.isDirectory() && existsSync(pageJsonPath)) {
      console.log(`  skip ${slug} — already migrated`);
      skipped++;
      continue;
    }
  }

  const raw = await readFile(flatPath, 'utf-8');
  const page = JSON.parse(raw);
  const sections = Array.isArray(page.sections) ? page.sections : null;

  if (!sections || sections.every((s) => typeof s === 'string')) {
    console.log(`  move ${slug} → ${slug}/page.json (no inline sections)`);
    if (!dryRun) {
      await mkdir(folderPath, { recursive: true });
      await writeFile(pageJsonPath, JSON.stringify(page, null, 2) + '\n', 'utf-8');
      await rm(flatPath);
    }
    noSections++;
    continue;
  }

  const width = String(sections.length).length >= 2 ? String(sections.length).length : 2;
  const sectionRefs = [];
  const sectionFiles = [];

  sections.forEach((section, i) => {
    const type = typeof section?.type === 'string' ? section.type : 'section';
    const nn = String(i + 1).padStart(width, '0');
    const fileName = `${nn}-${sanitizeTypeForFilename(type)}.json`;
    sectionRefs.push(`sections/${fileName}`);
    sectionFiles.push({ fileName, content: section });
  });

  const newPage = { ...page, sections: sectionRefs };

  console.log(`  migrate ${slug} → ${slug}/page.json + ${sectionFiles.length} section file(s)`);
  if (dryRun) {
    sectionFiles.forEach((sf) => console.log(`      sections/${sf.fileName}`));
    continue;
  }

  await mkdir(join(folderPath, 'sections'), { recursive: true });
  await writeFile(pageJsonPath, JSON.stringify(newPage, null, 2) + '\n', 'utf-8');
  for (const sf of sectionFiles) {
    await writeFile(
      join(folderPath, 'sections', sf.fileName),
      JSON.stringify(sf.content, null, 2) + '\n',
      'utf-8'
    );
  }
  await rm(flatPath);
  migrated++;
}

console.log(
  `\n${dryRun ? '[dry-run] ' : ''}done: migrated=${migrated} moved-no-sections=${noSections} skipped=${skipped}`
);

function sanitizeTypeForFilename(type) {
  return String(type)
    .replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
    .replace(/^-/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
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
