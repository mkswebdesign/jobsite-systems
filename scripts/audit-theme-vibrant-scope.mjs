#!/usr/bin/env node
/**
 * Audit: every per-section-theme override rule in src/builder/styles/brands/*.css
 * must be wrapped in :where(html[data-theme="vibrant"]) so the override only
 * paints in Vibrant mode.
 *
 * Why this matters — the three-mode theme system (Vibrant / Dark / Bright)
 * promises uniform dark in Dark mode and uniform light in Bright mode. A
 * rule like `.about-split[data-sec-theme='light'] { background: #faf9f5 }`
 * without the vibrant scope leaks the section override into Dark mode and
 * shows a light band on a dark page (recurring bug — fixed once on
 * about-split, has surfaced on other section types unnoticed).
 *
 * The fix is a single-selector wrap:
 *
 *   :where(html[data-theme="vibrant"]) .about-split[data-sec-theme='light'] {
 *     background: var(--bg-light, #faf9f5);
 *   }
 *
 * This script grep-matches every selector starting with
 *   .<section-type>[data-sec-theme=...]
 * in each brand CSS file and reports any whose line does not begin with
 * `:where(html[data-theme="vibrant"])`. The same rule may appear multiple
 * times for different section themes; each instance is reported.
 *
 * Exits 0 with a "no leaks" message when clean, 1 with a readable per-file
 * list when leaks are found. Fast (<100ms), no dependencies.
 */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const brandsDir = join(projectRoot, 'src', 'builder', 'styles', 'brands');

const rel = (p) => relative(projectRoot, p).replace(/\\/g, '/');

const files = (await readdir(brandsDir))
  .filter((f) => f.endsWith('.css'))
  .map((f) => join(brandsDir, f));

// Match any selector head of the form `.<class>[data-sec-theme=...]` —
// the only place section-theme overrides live by convention.
const SELECTOR_RE = /(^|,)\s*([^\n,{}]*?\.[a-z][\w-]*\[data-sec-theme=[^\]]+\][^,{}]*)/g;
// Vibrant scope: either form of vibrant-mode anchor on the html element
// in the same selector branch. Both `:where(html[data-theme="vibrant"])`
// (suppress-specificity wrap) and bare `html[data-theme="vibrant"]`
// (compound form, often combined with another html attr like
// `[data-cta-variant="F"]`) are valid. Single-quoted vs double-quoted
// both accepted.
const VIBRANT_SCOPE_RE = /(?::where\(\s*)?html\[data-theme=['"]vibrant['"]\]/;

const violations = [];

for (const file of files) {
  const css = await readFile(file, 'utf-8');
  const lines = css.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    SELECTOR_RE.lastIndex = 0;
    let m;
    while ((m = SELECTOR_RE.exec(line)) !== null) {
      const selector = m[2].trim();
      if (VIBRANT_SCOPE_RE.test(selector)) continue;
      // Skip pseudo-class chains where the rule is already
      // type-narrowed to a non-light/dark theme that's intended
      // to apply uniformly (rare; flag conservatively).
      violations.push({
        file: rel(file),
        line: i + 1,
        selector,
      });
    }
  }
}

if (!violations.length) {
  console.log('audit-theme-vibrant-scope: no leaks (every section-theme override is scoped to Vibrant mode).');
  process.exit(0);
}

// Group by file, print compactly.
const byFile = new Map();
for (const v of violations) {
  if (!byFile.has(v.file)) byFile.set(v.file, []);
  byFile.get(v.file).push(v);
}

console.error(`audit-theme-vibrant-scope: ${violations.length} leak(s) — section-theme overrides not scoped to Vibrant mode:`);
for (const [file, vs] of byFile) {
  console.error(`\n  ${file}`);
  for (const v of vs) {
    console.error(`    line ${v.line}: ${v.selector}`);
  }
}
console.error(`\nFix pattern — wrap each selector with :where(html[data-theme="vibrant"]):`);
console.error(`  :where(html[data-theme="vibrant"]) .<section>[data-sec-theme='<theme>'] { … }`);
console.error(`This way Dark and Bright modes correctly suppress the section override.`);

process.exit(1);
