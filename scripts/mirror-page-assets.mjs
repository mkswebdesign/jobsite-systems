#!/usr/bin/env node
/**
 * Mirrors per-page assets from the content repo into `public/assets/brands/`
 * so the Astro build picks them up and they end up in `dist/`.
 *
 *   SOURCE: arich-source/content/brands/<BRAND>/pages/<slug>/assets/**
 *   TARGET: arich-astro/public/assets/brands/<BRAND>/pages/<slug>/**
 *
 * Section JSON references assets as absolute URLs, e.g.
 *   "image": "/assets/brands/landscape-systems/pages/home/hero-bg.webp"
 *
 * Runs as a prebuild step; idempotent; safe to run when no page assets exist.
 * No-op for flat-format (non-migrated) pages — they have no assets/ subfolder.
 */
import { readdir, mkdir, copyFile, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const brand = process.env.BRAND || 'arich';
const pagesSrc = resolve(projectRoot, '..', 'arich-source', 'content', 'brands', brand, 'pages');
const pagesDest = resolve(projectRoot, 'public', 'assets', 'brands', brand, 'pages');

if (!existsSync(pagesSrc)) {
  console.log(`page-assets: no pages/ dir for brand=${brand}; skipping`);
  process.exit(0);
}

if (existsSync(pagesDest)) {
  await rm(pagesDest, { recursive: true, force: true });
}

const slugs = (await readdir(pagesSrc, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

let copiedFiles = 0;
let touchedSlugs = 0;

for (const slug of slugs) {
  const assetsDir = join(pagesSrc, slug, 'assets');
  if (!existsSync(assetsDir)) continue;
  const s = await stat(assetsDir);
  if (!s.isDirectory()) continue;

  const destDir = join(pagesDest, slug);
  await mkdir(destDir, { recursive: true });
  const count = await copyTree(assetsDir, destDir);
  if (count > 0) {
    touchedSlugs++;
    copiedFiles += count;
  }
}

console.log(
  `page-assets: brand=${brand} pages=${touchedSlugs} files=${copiedFiles} → public/assets/brands/${brand}/pages/`
);

async function copyTree(srcDir, destDir) {
  let count = 0;
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      await mkdir(dest, { recursive: true });
      count += await copyTree(src, dest);
    } else if (entry.isFile()) {
      await copyFile(src, dest);
      count++;
    }
  }
  return count;
}
