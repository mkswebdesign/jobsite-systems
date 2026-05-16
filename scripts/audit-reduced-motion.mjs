#!/usr/bin/env node
/**
 * Advisory audit: every CSS rule that declares `animation:` should have a
 * matching reset inside a `@media (prefers-reduced-motion: reduce)` block in
 * the same file. The convention is codified in
 * `src/builder/styles/brands/AGENTS.md §3` — this audit gives it teeth without
 * blocking anything yet.
 *
 * Advisory by design (exits 0 even on warnings). Promote to blocking ONCE the
 * existing files are clean and the convention is enforced everywhere.
 *
 * Scope: all `.css` files under `src/builder/styles/`. Skips `_current.css`
 * (auto-generated) and `node_modules` (defensive — shouldn't be inside styles).
 *
 * Usage:
 *   npm run audit-reduced-motion
 *
 * What it checks:
 *   1. Files with `animation:` declarations but no `@media (prefers-reduced-motion: reduce)` block.
 *   2. Animated selectors not covered by any reduced-motion-block selector
 *      (substring match in either direction — tolerates short-form resets like
 *      `.section { animation: none }` covering `.section .heading`,
 *      `.section .body`, etc.).
 *
 * What it reports informationally (no warning):
 *   - `transition:` declarations (transitions on hover/focus typically
 *     respect user-agent reduced-motion preferences).
 *   - `@keyframes` definitions (those are fine on their own; the load-bearing
 *     check is whether the consuming `animation:` declarations have resets).
 *
 * Known limitations:
 *   - Substring-based selector matching means an author can defeat the audit
 *     by using a different selector formulation in reduced-motion (e.g.
 *     class-toggle reset). False positive rate kept low; false negatives
 *     possible. Acceptable for advisory mode.
 *   - Does not inspect inline `<style>` blocks in `.astro` files. Brand CSS
 *     and shared stylesheets are the load-bearing surface.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const stylesRoot = join(projectRoot, 'src', 'builder', 'styles');

if (!existsSync(stylesRoot)) {
  console.error(`audit-reduced-motion: ${stylesRoot} not found`);
  process.exit(1);
}

const files = walkCss(stylesRoot).filter((f) => !f.endsWith('_current.css'));

const warnings = [];
let scanned = 0;
let totalAnimated = 0;
let totalCovered = 0;
let totalKeyframes = 0;
let totalTransitions = 0;
let filesWithRm = 0;
let filesWithAnimations = 0;

for (const file of files) {
  scanned++;
  const src = readFileSync(file, 'utf-8');
  const stripped = stripComments(src);
  const rules = parseRules(stripped);

  totalKeyframes += rules.filter((r) => r.atKind === 'keyframes').length;
  totalTransitions += rules.filter((r) => r.atKind !== 'keyframes' && /\btransition\s*:/.test(r.declarations)).length;

  const animatedRules = rules.filter((r) =>
    r.atKind !== 'keyframes' &&
    r.atKind !== 'reduced-motion' &&
    hasAnimationDeclaration(r.declarations)
  );
  const rmRules = rules.filter((r) => r.atKind === 'reduced-motion');

  if (animatedRules.length === 0) continue;
  filesWithAnimations++;
  totalAnimated += animatedRules.length;

  if (rmRules.length === 0) {
    warnings.push({
      file,
      kind: 'no-reduced-motion-block',
      detail: `file has ${animatedRules.length} animated rule(s) but no @media (prefers-reduced-motion: reduce) block`,
      line: animatedRules[0].line,
    });
    continue;
  }
  filesWithRm++;

  // Build the set of selectors covered by reduced-motion resets.
  const rmSelectors = [];
  for (const rmRule of rmRules) {
    for (const s of splitSelectors(rmRule.selector)) rmSelectors.push(normalizeSelector(s));
  }

  // For each animated rule, check at least one of its comma-split selectors
  // is covered (substring match in either direction).
  for (const rule of animatedRules) {
    const components = splitSelectors(rule.selector).map(normalizeSelector);
    const uncovered = components.filter((sel) => !rmSelectors.some((rm) => rm === sel || rm.includes(sel) || sel.includes(rm)));
    if (uncovered.length === 0) {
      totalCovered++;
      continue;
    }
    warnings.push({
      file,
      kind: 'selector-not-covered',
      detail: `animated selector(s) not matched by any reduced-motion reset: ${uncovered.map((s) => `'${s}'`).join(', ')}`,
      line: rule.line,
    });
  }
}

console.log(`audit-reduced-motion: scanned ${scanned} CSS file(s) under src/builder/styles/`);
console.log(`  files with animations: ${filesWithAnimations}`);
console.log(`  files with reduced-motion block: ${filesWithRm}`);
console.log(`  animated rules total: ${totalAnimated} (covered: ${totalCovered})`);
console.log(`  @keyframes definitions: ${totalKeyframes} (informational)`);
console.log(`  transition: declarations: ${totalTransitions} (informational; user-agent typically respects pref)`);

if (warnings.length === 0) {
  console.log(`  no advisory warnings — every animated rule has matching reduced-motion handling`);
  process.exit(0);
}

console.log('');
console.log(`audit-reduced-motion: ${warnings.length} advisory warning(s):`);
for (const w of warnings) {
  console.log(`  ${rel(w.file)}:${w.line}  [${w.kind}]`);
  console.log(`    ${w.detail}`);
}
console.log('');
console.log('  This audit is ADVISORY (exit 0). See src/builder/styles/brands/AGENTS.md §3 for the rule.');
console.log('  When existing files are clean, promote to blocking by switching the exit code.');
process.exit(0);

// ---- helpers ----

function walkCss(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walkCss(p));
    else if (entry.endsWith('.css')) out.push(p);
  }
  return out;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * Parse top-level CSS rules + nested rules under at-blocks.
 * Returns: [{ atKind, atSelector, selector, declarations, line }, ...]
 *   - atKind: null | 'keyframes' | 'reduced-motion' | 'other-at'
 *   - atSelector: the @media/@supports/@keyframes line, if any
 *   - selector: the rule's selector (e.g. `.foo, .bar`)
 *   - declarations: the body between { and }
 *   - line: 1-indexed line where the selector starts
 */
function parseRules(src) {
  const rules = [];
  let i = 0;
  let line = 1;
  parseBlock(null);
  return rules;

  function parseBlock(atContext) {
    while (i < src.length) {
      // Skip whitespace
      while (i < src.length && /\s/.test(src[i])) {
        if (src[i] === '\n') line++;
        i++;
      }
      if (i >= src.length) return;
      if (src[i] === '}') return; // end of containing block

      const ruleStartLine = line;
      const selStart = i;
      // Read until { or ; (statement-level at-rules)
      while (i < src.length && src[i] !== '{' && src[i] !== ';') {
        if (src[i] === '\n') line++;
        i++;
      }
      if (i >= src.length) return;
      const selector = src.slice(selStart, i).trim();
      if (src[i] === ';') { i++; continue; }
      // src[i] === '{'
      i++;

      if (selector.startsWith('@keyframes')) {
        // Skip body — keyframe selectors (e.g. `0%`, `to`) aren't real selectors.
        skipBalanced();
        rules.push({ atKind: 'keyframes', atSelector: selector, selector: '', declarations: '', line: ruleStartLine });
        continue;
      }
      if (selector.startsWith('@media') || selector.startsWith('@supports')) {
        const atKind = isReducedMotionMedia(selector) ? 'reduced-motion' : 'other-at';
        const innerContext = atKind === 'reduced-motion' ? 'reduced-motion' : (atContext || atKind);
        parseBlock(innerContext);
        if (i < src.length && src[i] === '}') i++;
        continue;
      }
      if (selector.startsWith('@')) {
        skipBalanced();
        continue;
      }
      // Regular rule — read body
      const declStart = i;
      let depth = 1;
      while (i < src.length && depth > 0) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') depth--;
        if (depth === 0) break;
        if (src[i] === '\n') line++;
        i++;
      }
      const declarations = src.slice(declStart, i);
      if (i < src.length) i++;
      rules.push({
        atKind: atContext === 'reduced-motion' ? 'reduced-motion' : null,
        atSelector: null,
        selector,
        declarations,
        line: ruleStartLine,
      });
    }
  }

  function skipBalanced() {
    let depth = 1;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      if (depth === 0) break;
      if (src[i] === '\n') line++;
      i++;
    }
    if (i < src.length) i++;
  }
}

function isReducedMotionMedia(s) {
  return /^@media[^{]*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/.test(s);
}

function hasAnimationDeclaration(declarations) {
  // Match `animation:` shorthand only — not animation-name, animation-duration, etc.
  // The shorthand is what triggers actual motion; subproperties alone don't.
  return /(?:^|[\s;{])animation\s*:/.test(declarations);
}

function splitSelectors(sel) {
  // Naive split on commas that aren't inside parens (e.g. :is(.a, .b)).
  const out = [];
  let depth = 0;
  let buf = '';
  for (const c of sel) {
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function normalizeSelector(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function rel(p) {
  return relative(projectRoot, p).replace(/\\/g, '/');
}
