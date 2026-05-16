#!/usr/bin/env node
/**
 * Brand-aware ship orchestrator.
 *
 * Holds a project-wide lock (via _ship-lock.mjs) for the duration of:
 *   1. generate-brand-assets.mjs --if-missing
 *   2. npm run build:fast        (validate-brand → write-brand-stylesheet → mirror-page-assets → astro build → prune-dist → ...)
 *   3. deploy.mjs (always preceded by a --list-stale-only preview pass; if --prune is set, runs deploy with --clean)
 *
 * Why a lock: dist/ is shared across brands. Two parallel ships with different BRANDs
 * race each other through astro build + prune-dist and ship contaminated assets.
 *
 * Why the stale preview: deploy is incremental and additive — files left over from a
 * previous build of a sibling brand (especially demo trees) accumulate in the mount.
 * The preview surfaces them every ship without touching them; pass --prune to delete.
 *
 * Usage:
 *   BRAND=arich npm run ship
 *   BRAND=arich npm run ship -- --prune     # also delete stale files in the mount
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquire, release, installSignalHandlers } from './_ship-lock.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const cfgPath = join(projectRoot, 'deploy.config.json');

const args = new Set(process.argv.slice(2));
const prune = args.has('--prune');

const brand = process.env.BRAND;
if (!brand) {
  console.error('ship: BRAND env var is required (e.g. BRAND=arich npm run ship)');
  process.exit(1);
}
if (!existsSync(cfgPath)) {
  console.error(`ship: deploy.config.json not found at ${cfgPath}`);
  process.exit(1);
}
let cfg;
try {
  cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
} catch (err) {
  console.error(`ship: failed to parse deploy.config.json: ${err.message}`);
  process.exit(1);
}
if (!Object.prototype.hasOwnProperty.call(cfg, brand)) {
  const known = Object.keys(cfg).join(', ');
  console.error(`ship: BRAND='${brand}' is not in deploy.config.json (known: ${known || '(none)'})`);
  process.exit(1);
}

installSignalHandlers();
acquire(brand);

try {
  run('node scripts/generate-brand-assets.mjs --if-missing');
  run('npm run build:fast', { SHIP_LOCK_HELD: '1' });
  /* Stale-file preview: prints any files on the mount that aren't in
   * dist for this brand. Always advisory unless --prune is set, in which
   * case the deploy below runs with --clean and actually removes them. */
  run('node scripts/deploy.mjs --list-stale-only');
  if (prune) {
    console.log(`ship[${brand}]: --prune set → deploying with --clean (stale files above will be removed)`);
    run('node scripts/deploy.mjs --clean');
  } else {
    run('node scripts/deploy.mjs');
  }
  /* Advisory: smoke check the live URL after deploy. Failure here is
   * deliberately not propagated — the ship is already done; this is just
   * a loud signal next to the green log when something looks wrong. */
  runAdvisory('node scripts/smoke-check.mjs');
} finally {
  release();
}

function run(cmd, extraEnv = {}) {
  console.log(`ship[${brand}]: ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: projectRoot, env: { ...process.env, ...extraEnv } });
}

function runAdvisory(cmd, extraEnv = {}) {
  try {
    run(cmd, extraEnv);
  } catch {
    console.warn(`\nship[${brand}]: ⚠ advisory check failed — ship completed but ${cmd} reported issues. Ignoring exit code as agreed (advisory only).\n`);
  }
}
