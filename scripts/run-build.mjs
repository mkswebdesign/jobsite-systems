#!/usr/bin/env node
/**
 * Brand-aware build wrapper for `npm run build` and `npm run build:fast`.
 *
 * Holds .ship.lock for the build duration UNLESS SHIP_LOCK_HELD=1 is set by a parent
 * ship.mjs that already holds it (avoids self-deadlock when ship invokes build:fast).
 *
 * Why: dist/ is shared across brands. A standalone build:fast running in parallel with
 * a ship — or two parallel build:fast for different brands — corrupts dist/ during
 * astro build + prune-dist.
 *
 * Usage:
 *   BRAND=arich node scripts/run-build.mjs           # build:fast (no astro check)
 *   BRAND=arich node scripts/run-build.mjs --check   # build (with astro check)
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquire, release, installSignalHandlers } from './_ship-lock.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const brand = process.env.BRAND;
if (!brand) {
  console.error('build: BRAND env var is required (e.g. BRAND=arich npm run build:fast)');
  process.exit(1);
}

const withCheck = process.argv.slice(2).includes('--check');
const inShip = process.env.SHIP_LOCK_HELD === '1';

if (!inShip) {
  installSignalHandlers();
  acquire(brand);
}

try {
  run('node scripts/validate-brand.mjs');
  run('node scripts/heal-section-overrides.mjs');
  run('node scripts/audit-variants.mjs');
  run('node scripts/audit-sections.mjs');
  run('node scripts/write-brand-stylesheet.mjs');
  run('node scripts/mirror-page-assets.mjs');
  if (withCheck) run('npx astro check');
  run('npx astro build');
  run('node scripts/prune-dist.mjs');
  /* build-redirects + build-search-index MUST run after prune-dist: prune
   * removes any dist/ paths that aren't in the brand's route map, so any file
   * (redirect stubs OR search.json) emitted before prune would be deleted.
   * Both are independent of each other — order between the two doesn't matter. */
  run('node scripts/build-redirects.mjs');
  run('node scripts/build-search-index.mjs');
  run('node scripts/build-addon-index.mjs');
  run('node scripts/build-theme-index.mjs');
} finally {
  if (!inShip) release();
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: projectRoot });
}
