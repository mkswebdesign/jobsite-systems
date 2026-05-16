#!/usr/bin/env node
/**
 * Audit: every key in `data-section-variants="A:Default,B:..."` declarations across
 * src/**\/*.astro must be allowed by the cap defined in src/builder/lib/variants.ts.
 *
 * A letter beyond MAX_VARIANT_LETTER (or a malformed kebab key) would be silently
 * dropped by Base.astro's pre-paint sanitizer at runtime — this catches it at build
 * time. Fast (<200ms), no dependencies. Exits 1 with a readable list of violations.
 *
 * Internal-fork's per-group variant ranges in src/pages/internal-fork/options.astro
 * are intentionally narrower than the cap (e.g. hero `B-F` even though Hero ships H);
 * they are NOT audited here.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const variantsTs = join(projectRoot, 'src', 'builder', 'lib', 'variants.ts');
const srcDir = join(projectRoot, 'src');

if (!existsSync(variantsTs)) {
  console.error(`audit-variants: missing ${rel(variantsTs)}`);
  process.exit(1);
}
const variantsSrc = await readFile(variantsTs, 'utf-8');
const maxLetterMatch = variantsSrc.match(/MAX_VARIANT_LETTER\s*=\s*['"]([A-Z])['"]/);
if (!maxLetterMatch) {
  console.error('audit-variants: cannot parse MAX_VARIANT_LETTER from variants.ts');
  process.exit(1);
}
const MAX = maxLetterMatch[1];
const MAX_CODE = MAX.charCodeAt(0);
const A_CODE = 'A'.charCodeAt(0);
const KEBAB_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const ATTR_RE = /data-section-variants\s*=\s*["']([^"']+)["']/g;

const errors = [];
let scanned = 0;
let declarations = 0;

for await (const file of walk(srcDir)) {
  scanned++;
  const src = await readFile(file, 'utf-8');
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    ATTR_RE.lastIndex = 0;
    let m;
    while ((m = ATTR_RE.exec(line))) {
      declarations++;
      const value = m[1];
      const pairs = value.split(',').map((s) => s.trim()).filter(Boolean);
      if (pairs.length === 0) {
        errors.push(`${rel(file)}:${i + 1}: empty data-section-variants value`);
        continue;
      }
      for (const pair of pairs) {
        const colon = pair.indexOf(':');
        if (colon < 1) {
          errors.push(`${rel(file)}:${i + 1}: malformed entry '${pair}' (expected 'KEY:Label')`);
          continue;
        }
        const key = pair.slice(0, colon);
        if (/^[A-Z]$/.test(key)) {
          const code = key.charCodeAt(0);
          if (code < A_CODE || code > MAX_CODE) {
            errors.push(
              `${rel(file)}:${i + 1}: variant '${key}' exceeds MAX_VARIANT_LETTER='${MAX}' — Base.astro will silently drop it. ` +
                `Bump src/builder/lib/variants.ts MAX_VARIANT_LETTER if intentional.`
            );
          }
        } else if (!KEBAB_RE.test(key)) {
          errors.push(
            `${rel(file)}:${i + 1}: variant key '${key}' is not A-${MAX} and does not match ${KEBAB_RE.source} — Base.astro will silently drop it.`
          );
        }
      }
    }
  }
}

if (errors.length) {
  console.error(`audit-variants: ${errors.length} violation(s) (max=${MAX}, scanned=${scanned} files):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`audit-variants: ok (max=${MAX}, scanned=${scanned} files, ${declarations} declarations)`);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && entry.name.endsWith('.astro')) yield p;
  }
}

function rel(p) {
  return relative(projectRoot, p).replace(/\\/g, '/');
}
