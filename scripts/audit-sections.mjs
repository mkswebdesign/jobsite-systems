#!/usr/bin/env node
/**
 * Structural audit of the section library. Parses the `pageSection`
 * discriminated union in src/content/config.ts and verifies every member is
 * reflected in the docs, the index, the examples, and the validator allowlist.
 *
 * Fast (<200ms), no dependencies. Exits 1 with a readable list of gaps.
 *
 * Invoke as `npm run audit-sections`. Wired into `run-build.mjs` after
 * `audit-variants` so docs/index/example drift fails the build (not just ship).
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(projectRoot, 'src', 'content', 'config.ts');
const sectionsDir = join(projectRoot, 'src', 'builder', 'components', 'sections');
const readmePath = join(sectionsDir, 'README.md');
const validatorPath = join(projectRoot, 'scripts', 'validate-brand.mjs');
const examplesPath = resolve(projectRoot, '..', 'arich-source', 'content', '_examples', 'sections.json');

const errors = [];

const configSrc = await readFile(configPath, 'utf-8');

const unionMatch = configSrc.match(/const\s+pageSection\s*=\s*z\.discriminatedUnion\(\s*['"]type['"]\s*,\s*\[([^\]]*)\]\s*\)/s);
if (!unionMatch) {
  fail("couldn't parse pageSection discriminatedUnion from src/content/config.ts");
}

const memberNames = unionMatch[1]
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const types = [];
for (const memberName of memberNames) {
  const memberRegex = new RegExp(
    `const\\s+${memberName}\\s*=\\s*z\\.object\\(\\{[^]*?type:\\s*z\\.literal\\(['"]([^'"]+)['"]\\)`,
    'm'
  );
  const typeMatch = configSrc.match(memberRegex);
  if (typeMatch) types.push(typeMatch[1]);
  else errors.push(`couldn't resolve z.literal() for union member '${memberName}'`);
}

if (types.length === 0) fail('no section types parsed from pageSection union');

const readmeSrc = existsSync(readmePath) ? await readFile(readmePath, 'utf-8') : null;
const validatorSrc = existsSync(validatorPath) ? await readFile(validatorPath, 'utf-8') : null;
let examples = null;
if (existsSync(examplesPath)) {
  try {
    examples = JSON.parse(await readFile(examplesPath, 'utf-8'));
  } catch (err) {
    errors.push(`content/_examples/sections.json is invalid JSON: ${err.message}`);
  }
}

if (!readmeSrc) errors.push(`missing: ${rel(readmePath)}`);
if (!validatorSrc) errors.push(`missing: ${rel(validatorPath)}`);
if (!examples) errors.push(`missing or unreadable: ${rel(examplesPath)}`);

for (const type of types) {
  const docName = type.charAt(0).toUpperCase() + type.slice(1) + '.md';
  const docPath = join(sectionsDir, docName);

  if (!existsSync(docPath)) {
    errors.push(`[${type}] missing doc: src/builder/components/sections/${docName}`);
  }

  if (readmeSrc && !readmeSrc.includes('`' + type + '`')) {
    errors.push(`[${type}] not referenced in sections/README.md index (expected backticked \`${type}\`)`);
  }

  if (examples) {
    const entry = examples[type];
    if (!entry) {
      errors.push(`[${type}] no entry in content/_examples/sections.json`);
    } else if (entry.type !== type) {
      errors.push(`[${type}] example entry has type='${entry.type}' (expected '${type}')`);
    }
  }

  /* validate-brand may either:
   *   (a) hardcode KNOWN_SECTION_TYPES as a literal Set (legacy), in which case
   *       every type must appear as a string literal in its source, or
   *   (b) derive KNOWN_SECTION_TYPES from sections.ts SECTION_REGISTRY (Round 2
   *       Phase 4+), in which case the per-type substring check is moot — the
   *       registry cross-check above already guarantees every Zod-union member
   *       has a registry entry.
   * Detection: presence of `loadSectionTypesFromRegistry` or `SECTION_REGISTRY`
   * in validate-brand.mjs source. */
  if (validatorSrc && !validatorIsRegistryDerived(validatorSrc)) {
    if (!validatorSrc.includes(`'${type}'`) && !validatorSrc.includes(`"${type}"`)) {
      errors.push(`[${type}] not in KNOWN_SECTION_TYPES in scripts/validate-brand.mjs`);
    }
  }
}

if (validatorSrc && !validatorIsRegistryDerived(validatorSrc)) {
  const knownMatch = validatorSrc.match(/KNOWN_SECTION_TYPES\s*=\s*new Set\(\[([^\]]+)\]\)/s);
  if (knownMatch) {
    const knownTypes = [...knownMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const kt of knownTypes) {
      if (!types.includes(kt)) {
        errors.push(`[${kt}] in KNOWN_SECTION_TYPES but not in pageSection union — union is the source of truth`);
      }
    }
  }
}

function validatorIsRegistryDerived(src) {
  return /loadSectionTypesFromRegistry|SECTION_REGISTRY/.test(src);
}

/* Editor wiring check: every .astro component in sections/ must declare the
   three attributes the in-page editor reads to render its CHIP-LBL and
   variant picker. Without them the section is invisible to the editor.
   Applies to the whole folder — including interior-page components like
   SiteCta/NextSteps — since they all load inside the editor overlay. */
const componentFiles = (await readdir(sectionsDir)).filter((f) => f.endsWith('.astro'));
for (const filename of componentFiles) {
  const src = await readFile(join(sectionsDir, filename), 'utf-8');
  const missing = [];
  if (!/data-section-type\s*=/.test(src)) missing.push('data-section-type');
  if (!/data-section-label\s*=/.test(src)) missing.push('data-section-label');
  if (!/data-section-variants\s*=/.test(src)) missing.push('data-section-variants');
  if (missing.length) {
    errors.push(`[editor-wiring] ${filename} missing ${missing.join(', ')} — editor CHIP-LBL + variant picker won't render`);
  }
}

/* Section-registry cross-check (additive — phase 1).
 *
 * If `src/builder/lib/sections.ts` exists, parse its SECTION_REGISTRY and
 * verify that every registered entry agrees with the component + docs on the
 * filesystem. Sections not yet in the registry skip this block; the existing
 * checks above still cover them. Drift between registry and component shows
 * up here with file:line context so a registered section can't silently
 * disagree with its own component. */
const registryPath = join(projectRoot, 'src', 'builder', 'lib', 'sections.ts');
const registryEntries = existsSync(registryPath) ? parseRegistry(await readFile(registryPath, 'utf-8')) : [];

for (const entry of registryEntries) {
  // 1. If the entry claims a Zod type, the union must include it.
  if (entry.type && !types.includes(entry.type)) {
    errors.push(`[registry] entry type='${entry.type}' is not in pageSection union — add a Zod member or drop the registry entry`);
  }
  // 2. Component file must exist.
  const componentPath = join(sectionsDir, entry.component + '.astro');
  if (!existsSync(componentPath)) {
    errors.push(`[registry] entry kind='${entry.kind}' references missing component: src/builder/components/sections/${entry.component}.astro`);
    continue;
  }
  // 3-4. Component data-section-type and data-section-label must match registry kind/label.
  const componentSrc = await readFile(componentPath, 'utf-8');
  const kindMatch = componentSrc.match(/data-section-type\s*=\s*["']([^"']+)["']/);
  if (kindMatch && kindMatch[1] !== entry.kind) {
    errors.push(`[registry] ${entry.component}.astro data-section-type='${kindMatch[1]}' does not match registry kind='${entry.kind}'`);
  }
  const labelMatch = componentSrc.match(/data-section-label\s*=\s*["']([^"']+)["']/);
  if (labelMatch && labelMatch[1] !== entry.label) {
    errors.push(`[registry] ${entry.component}.astro data-section-label='${labelMatch[1]}' does not match registry label='${entry.label}'`);
  }
  // 5. Doc file must exist (the existing audit already checks this for union members; this catches 'interior' entries it would otherwise skip).
  const docPath = join(sectionsDir, entry.docFile + '.md');
  if (!existsSync(docPath)) {
    errors.push(`[registry] entry kind='${entry.kind}' references missing doc: src/builder/components/sections/${entry.docFile}.md`);
  }
}

if (errors.length) {
  console.error(`audit-sections: ${errors.length} issue(s) found`);
  errors.forEach((e) => console.error(`  ${e}`));
  process.exit(1);
}

const registryNote = registryEntries.length ? `, ${registryEntries.length} registered` : '';
console.log(`audit-sections: ok — ${types.length} section types${registryNote} (${types.join(', ')})`);

/** Parse SECTION_REGISTRY entries from sections.ts source. Tolerates only flat
 *  object literals with string-literal field values — the constraint named in
 *  the registry's design audit. Spread / computed keys / imports break this and
 *  should be caught here, not silently ignored. */
function parseRegistry(src) {
  const arrMatch = src.match(/SECTION_REGISTRY[^=]*=\s*\[([\s\S]*?)\]\s*;/);
  if (!arrMatch) return [];
  const body = arrMatch[1];
  const entries = [];
  const objRe = /\{([^{}]+)\}/g;
  let m;
  while ((m = objRe.exec(body))) {
    const fields = {};
    for (const fm of m[1].matchAll(/(\w+)\s*:\s*['"]([^'"]+)['"]/g)) {
      fields[fm[1]] = fm[2];
    }
    if (fields.kind && fields.component) entries.push(fields);
  }
  return entries;
}

function fail(msg) {
  console.error(`audit-sections: ${msg}`);
  process.exit(1);
}

function rel(p) {
  return p.replace(projectRoot + '\\', '').replace(projectRoot + '/', '');
}
