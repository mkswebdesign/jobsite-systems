#!/usr/bin/env node
/**
 * Pre-build path patcher for xCloud deployment.
 *
 * On the server the arich-source content lives inside the repo (not as a
 * sibling directory). This script rewrites every '../arich-source' reference
 * so it resolves to the in-repo copy instead. Safe to run repeatedly —
 * each deployment starts from a fresh git pull.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
let count = 0;

function patchFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let patched = content
    // 3-level traversal (e.g. src/pages/llms.txt.ts) → keep 2 levels
    .replaceAll("'..', '..', '..', 'arich-source'", "'..', '..', 'arich-source'")
    // 1-level traversal in join() calls → remove the '..'
    .replaceAll("'..', 'arich-source'", "'arich-source'")
    .replaceAll('"..","arich-source"', '"arich-source"')
    // Template literals and plain strings
    .replaceAll('../arich-source/', 'arich-source/')
    .replaceAll('../arich-source', 'arich-source');

  if (content !== patched) {
    writeFileSync(filePath, patched);
    count++;
    console.log(`  patched: ${filePath.replace(root + '/', '')}`);
  }
}

function walkDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.astro', 'dist', '.git'].includes(entry.name)) {
      walkDir(full);
    } else if (/\.(mjs|ts|astro|json)$/.test(entry.name)) {
      patchFile(full);
    }
  }
}

console.log('patch-server-paths: rewriting ../arich-source → arich-source ...');
patchFile(join(root, 'astro.config.mjs'));
patchFile(join(root, 'tsconfig.json'));
walkDir(join(root, 'scripts'));
walkDir(join(root, 'src'));
console.log(`patch-server-paths: done — ${count} file(s) patched.`);
