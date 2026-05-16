#!/usr/bin/env node
/**
 * Brand-aware deploy: copies dist/ to a target path (typically a Mountain Duck mount).
 *
 * Usage:
 *   BRAND=arich DEPLOY_TARGET="c:/Users/antho/Mountain Duck/<uuid>" node scripts/deploy.mjs
 *
 * Or configure targets per brand in deploy.config.json:
 *   { "arich": "c:/.../<uuid>", "test-niche": "c:/.../<uuid2>" }
 *
 * Flags:
 *   --clean             Remove files in target that no longer exist in dist (default: off, additive copy only)
 *   --dry               Show what would be copied without writing
 *   --list-stale-only   Print files on the mount that aren't in dist for this brand and exit. No copy, no remove.
 */
import { readdirSync, statSync, mkdirSync, copyFileSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseEditorVersion } from './_lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');

const args = new Set(process.argv.slice(2));
const clean = args.has('--clean');
const dry = args.has('--dry');
/* --list-stale-only: walk dist + target, print files in target that
 * aren't in dist for this brand, then exit. No copies, no removals.
 * Used as the ship.mjs pre-deploy preview so a human can eyeball what
 * `--prune` would delete before authorizing it. */
const listStaleOnly = args.has('--list-stale-only');

const brand = process.env.BRAND;
if (!brand) {
  console.error('deploy: BRAND env var is required (e.g. BRAND=arich node scripts/deploy.mjs)');
  process.exit(1);
}

let target = process.env.DEPLOY_TARGET;
const cfgPath = join(projectRoot, 'deploy.config.json');
let cfg = null;
if (existsSync(cfgPath)) {
  try {
    cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
  } catch (err) {
    console.error(`deploy: failed to parse deploy.config.json: ${err.message}`);
    process.exit(1);
  }
}
if (!target) {
  if (!cfg) {
    console.error(`deploy: no DEPLOY_TARGET set and no deploy.config.json at ${cfgPath}.`);
    process.exit(1);
  }
  if (!Object.prototype.hasOwnProperty.call(cfg, brand)) {
    const known = Object.keys(cfg).join(', ');
    console.error(`deploy: BRAND='${brand}' is not a known brand (deploy.config.json keys: ${known || '(none)'})`);
    console.error('  Add an entry to deploy.config.json or set DEPLOY_TARGET explicitly.');
    process.exit(1);
  }
  target = cfg[brand];
}
if (!target) {
  console.error(`deploy: no deploy target. Set DEPLOY_TARGET env or add "${brand}" to deploy.config.json.`);
  process.exit(1);
}
if (!existsSync(distDir)) {
  console.error(`dist/ not found. Run: BRAND=${brand} npm run build:fast`);
  process.exit(1);
}
if (!existsSync(target)) {
  console.error(`Target path does not exist: ${target}`);
  console.error('For Mountain Duck mounts, ensure the bookmark is connected.');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/* Files on the mount that are intentionally not in dist/ and must survive a --clean sweep:
 *   - desktop.ini — Windows folder metadata
 *   - CLAUDE.md   — guardrail for future Claude sessions explaining what the mount serves
 *   - .claude/    — any local Claude state dropped on the mount
 *   - .well-known — standard URI prefix (security.txt, llms.txt for AI crawlers, etc.)
 * Note: 404.html is now produced by src/pages/404.astro and will overwrite any
 * hand-crafted copy on the mount on each ship — that's intentional (template-driven).
 */
const CLEAN_SKIP_PATTERNS = ['desktop.ini', 'CLAUDE.md', '.claude', '.well-known'];

const sourceFiles = walk(distDir);
let copied = 0;
let skipped = 0;

if (listStaleOnly) {
  const targetFiles = walk(target).filter(f => !CLEAN_SKIP_PATTERNS.some(p => f.includes(p)));
  const sourceRelSet = new Set(sourceFiles.map(f => relative(distDir, f)));
  const stale = targetFiles
    .filter(tf => !sourceRelSet.has(relative(target, tf)))
    .map(tf => relative(target, tf).replace(/\\/g, '/'));
  console.log(`brand: ${brand}`);
  console.log(`target: ${target}`);
  if (stale.length === 0) {
    console.log('stale: 0  (mount is clean for this brand)');
  } else {
    console.log(`stale: ${stale.length} file(s) on mount but not in dist:`);
    for (const s of stale) console.log(`  ${s}`);
  }
  process.exit(0);
}

for (const src of sourceFiles) {
  const rel = relative(distDir, src);
  const dst = join(target, rel);
  const srcStat = statSync(src);

  if (existsSync(dst)) {
    const dstStat = statSync(dst);
    if (dstStat.size === srcStat.size && dstStat.mtimeMs >= srcStat.mtimeMs) {
      skipped++;
      continue;
    }
  }

  if (dry) {
    console.log(`[dry] ${rel}`);
    copied++;
    continue;
  }

  mkdirSync(dirname(dst), { recursive: true });
  /* Mountain Duck occasionally write-protects existing files at the mount
   * (most reliably reproducible with `.htaccess` after redirect emission).
   * On EPERM, remove the destination and retry once. If the second attempt
   * still fails, propagate the error — the issue is real and the user
   * needs to investigate (lock holder, AV, mount mode). */
  try {
    copyFileSync(src, dst);
  } catch (err) {
    if (err && err.code === 'EPERM' && existsSync(dst)) {
      try { rmSync(dst, { force: true }); } catch { /* fall through */ }
      copyFileSync(src, dst);
    } else {
      throw err;
    }
  }
  copied++;
}

let removed = 0;
let removedDirs = 0;
if (clean) {
  const targetFiles = walk(target).filter(f => !CLEAN_SKIP_PATTERNS.some(p => f.includes(p)));
  const sourceRelSet = new Set(sourceFiles.map(f => relative(distDir, f)));
  for (const tf of targetFiles) {
    const rel = relative(target, tf);
    if (!sourceRelSet.has(rel)) {
      if (dry) console.log(`[dry] remove ${rel}`);
      else rmSync(tf);
      removed++;
    }
  }
  // Second pass: remove directories that are empty after the file sweep (deepest first so parents can be emptied too).
  if (!dry) {
    const allDirs = [];
    function walkDirs(dir) {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walkDirs(p); allDirs.push(p); }
      }
    }
    walkDirs(target);
    for (const d of allDirs.sort((a, b) => b.length - a.length)) {
      if (CLEAN_SKIP_PATTERNS.some(p => d.includes(p))) continue;
      try {
        if (readdirSync(d).length === 0) {
          rmSync(d, { recursive: false });
          removedDirs++;
        }
      } catch (_) { /* gone already */ }
    }
  }
}

console.log(`brand: ${brand}`);
console.log(`target: ${target}`);
console.log(`copied: ${copied}  skipped: ${skipped}${clean ? `  removed: ${removed}${removedDirs ? ` (+${removedDirs} empty dirs)` : ''}` : ''}${dry ? '  (DRY RUN)' : ''}`);

/* Per-ship manifest — local-only audit trail (not shipped to the target).
 * Lives at <projectRoot>/.ship-manifest.json, keyed by brand so a ship of
 * brand A doesn't clobber the record of the last ship of brand B. Written
 * only on real (non-dry) deploys. */
if (!dry) {
  try {
    const totalBytes = sourceFiles.reduce((n, f) => n + statSync(f).size, 0);
    const indexHtmlPath = join(distDir, 'index.html');
    let indexHash = null;
    let builtAt = null;
    if (existsSync(indexHtmlPath)) {
      const buf = readFileSync(indexHtmlPath);
      indexHash = createHash('sha256').update(buf).digest('hex');
      builtAt = new Date(statSync(indexHtmlPath).mtimeMs).toISOString();
    }
    const editorVersion = parseEditorVersion(projectRoot);
    const manifestPath = join(projectRoot, '.ship-manifest.json');
    let manifest = { schemaVersion: 1, brands: {} };
    if (existsSync(manifestPath)) {
      try {
        const parsed = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        if (parsed && typeof parsed === 'object' && parsed.brands && typeof parsed.brands === 'object') {
          manifest = parsed;
        }
      } catch { /* malformed — overwrite */ }
    }
    manifest.brands[brand] = {
      lastShipAt: new Date().toISOString(),
      files: sourceFiles.length,
      totalBytes,
      indexHash,
      builtAt,
      editorVersion,
      target,
      copied,
      skipped,
      cleaned: clean ? removed : null,
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`manifest: ${relative(projectRoot, manifestPath).replace(/\\/g, '/')} updated for brand=${brand}`);
  } catch (err) {
    console.error(`manifest: failed to write — ${err.message}`);
    /* Manifest is observability, not load-bearing. Don't fail the deploy. */
  }
}
