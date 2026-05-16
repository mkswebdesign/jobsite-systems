#!/usr/bin/env node
/**
 * Post-build: remove dist/assets/brands/{other brands}, keeping only the active BRAND.
 * Astro copies all of public/ (including every brand's assets) into dist/, so
 * without this, each build ships with sibling-brand assets.
 */
import { readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distBrands = join(__dirname, '..', 'dist', 'assets', 'brands');
const active = process.env.BRAND;
if (!active) {
  console.error('prune-dist: BRAND env var is required (e.g. BRAND=arich node scripts/prune-dist.mjs)');
  process.exit(1);
}

if (!existsSync(distBrands)) process.exit(0);

let pruned = 0;
for (const entry of readdirSync(distBrands)) {
  if (entry !== active) {
    rmSync(join(distBrands, entry), { recursive: true, force: true });
    pruned++;
  }
}

if (pruned) console.log(`pruned ${pruned} sibling brand(s) from dist/assets/brands/`);

/* Remove /best/ output when this brand has no `pages/best.json` (hub is a static page that still
 * compiles, but the section should not ship in dist for other brands). */
const projectRoot = join(__dirname, '..');
const bestPage = join(
  projectRoot,
  '..',
  'arich-source',
  'content',
  'brands',
  active,
  'pages',
  'best.json'
);
const distBest = join(projectRoot, 'dist', 'best');
if (!existsSync(bestPage) && existsSync(distBest)) {
  rmSync(distBest, { recursive: true, force: true });
  console.log(`pruned dist/best/ (no content/brands/${active}/pages/best.json)`);
}

/* Remove /demo/ output when this brand has no `demos/` folder (Mode B client
 * sites and other brands without showcase demos still compile the demo route
 * with an empty-state page; pruning eliminates the orphan route from ship). */
const demosFolder = join(projectRoot, '..', 'arich-source', 'content', 'brands', active, 'demos');
const distDemo = join(projectRoot, 'dist', 'demo');
if (!existsSync(demosFolder) && existsSync(distDemo)) {
  rmSync(distDemo, { recursive: true, force: true });
  console.log(`pruned dist/demo/ (no content/brands/${active}/demos/)`);
}

/* Remove /location/ output when this brand has no `pages/location` entry
 * (flat `pages/location.json` or folder-format `pages/location/page.json`).
 * Mirrors /best/: pages/location.astro now soft-fails into an empty shell
 * for brands without a location authored, and this prune drops the route
 * from ship. */
const locationFlat = join(projectRoot, '..', 'arich-source', 'content', 'brands', active, 'pages', 'location.json');
const locationFolder = join(projectRoot, '..', 'arich-source', 'content', 'brands', active, 'pages', 'location', 'page.json');
const distLocation = join(projectRoot, 'dist', 'location');
if (!existsSync(locationFlat) && !existsSync(locationFolder) && existsSync(distLocation)) {
  rmSync(distLocation, { recursive: true, force: true });
  console.log(`pruned dist/location/ (no content/brands/${active}/pages/location[.json|/page.json])`);
}

/* Remove /team/ output when this brand has no `pages/team` entry. Same
 * pattern as /location/. */
const teamFlat = join(projectRoot, '..', 'arich-source', 'content', 'brands', active, 'pages', 'team.json');
const teamFolder = join(projectRoot, '..', 'arich-source', 'content', 'brands', active, 'pages', 'team', 'page.json');
const distTeam = join(projectRoot, 'dist', 'team');
if (!existsSync(teamFlat) && !existsSync(teamFolder) && existsSync(distTeam)) {
  rmSync(distTeam, { recursive: true, force: true });
  console.log(`pruned dist/team/ (no content/brands/${active}/pages/team[.json|/page.json])`);
}
