#!/usr/bin/env node
/**
 * Lint a brand folder for leftover source-brand contamination.
 *
 * Usage:
 *   node scripts/brand-lint.mjs <brand-id> [--json]
 *
 * Scans:
 *   ../arich-source/content/brands/<brand-id>/**\/*.{json,txt}
 *
 * Checks:
 *   - String tokens that are specific to the `arich` source brand (owner name,
 *     brand name, domain, email, specific client/testimonial proper nouns) and
 *     should have been replaced during the /new-brand flow.
 *   - Structural flags: work folder unchanged from arich, testimonials unchanged.
 *
 * The canonical source brand is the one `scaffold-brand.mjs` clones from:
 * `arich`. If linting the `arich` brand itself, token checks are skipped
 * (they'd all false-positive).
 *
 * Exit codes:
 *   0 — clean (or only warnings)
 *   1 — contamination found (errors)
 *   2 — usage error
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const contentRoot = join(projectRoot, '..', 'arich-source', 'content', 'brands');
const publicRoot = join(projectRoot, 'public', 'assets', 'brands');

const args = process.argv.slice(2);
const brandId = args.find(a => !a.startsWith('--'));
const asJson = args.includes('--json');
const SOURCE_BRAND = 'arich';

if (!brandId) {
  console.error('Usage: node scripts/brand-lint.mjs <brand-id> [--json]');
  process.exit(2);
}

const brandRoot = join(contentRoot, brandId);
if (!existsSync(brandRoot)) {
  console.error(`Brand not found: ${brandRoot}`);
  process.exit(2);
}

/* ---------- token checks ---------- */

/**
 * Each check: { id, label, pattern, severity, appliesTo? }
 *   pattern   — RegExp matched against file content
 *   severity  — 'error' | 'warn'
 *   appliesTo — optional filename glob; default = all .json/.txt
 */
const checks = [
  // Owner / brand identity
  { id: 'owner-name',     label: 'Owner name "Anthony" / "Anthony Richter"', pattern: /\bAnthony(\s+Richter)?\b/, severity: 'error' },
  { id: 'owner-surname',  label: 'Surname "Richter"',                        pattern: /\bRichter\b/,              severity: 'error' },
  { id: 'brand-name',     label: 'Brand name "A Rich Design"',               pattern: /A Rich Design/,            severity: 'error' },
  { id: 'legacy-brand',   label: 'Legacy brand "MKS" / "MKS Web Design"',    pattern: /\bMKS(\s+Web\s+Design)?\b/,severity: 'error' },
  { id: 'domain',         label: 'Domain "arich.design"',                    pattern: /arich\.design/,            severity: 'error' },
  { id: 'legacy-domain',  label: 'Legacy domain "mkswebdesign.com"',         pattern: /mkswebdesign\.com/,        severity: 'error' },
  { id: 'email',          label: 'Email "hi@arich.design"',                  pattern: /hi@arich\.design/,         severity: 'error' },
  { id: 'linkedin',       label: 'LinkedIn "anthonylrichter"',               pattern: /anthonylrichter/,          severity: 'error' },

  // Testimonial authors (arich's real clients — must be replaced for a fork)
  { id: 'testimonial-authors', label: 'Testimonial author names from arich', severity: 'error',
    pattern: /\b(Nikki Short|Crystal Magette|Henry Mascaux|Shaylyn Hanna|Bria Taddiken-Williams|Jennifer Wenderott|Brandon Hagedorn|Bret Shaw|Debra Larsen|Patrick Montgomery|Tara Claycamp|Derek Taussig|Terri Hollenbeck)\b/ },

  // Work case study clients (arich's portfolio — must be replaced or removed)
  { id: 'work-clients',   label: 'Work/case-study client names from arich',  severity: 'error',
    pattern: /\b(Coldwell Banker|Sharp Manufacturing|Navigate Counseling|Global Cheer Dance|Innovate24|Central Comfort Air)\b/ },

  // Unfilled template placeholders — `{{SLOT_NAME}}` markers from the starter
  // templates that must be replaced with actual business values.
  { id: 'unfilled-placeholders', label: 'Unfilled template placeholder(s) {{...}}', severity: 'error',
    pattern: /\{\{[A-Z][A-Z0-9_]*\}\}/ },
];

/* Per-brand allowlists: check ids whose hits are legitimate for that brand.
 * Used when the new brand has a structural relationship to the source
 * (e.g., gomks is a product tier of MKS Web Design — the parent-brand
 * references are intentional cross-links, not source contamination). */
const BRAND_ALLOWLISTS = {
  gomks: new Set(['owner-name', 'owner-surname', 'linkedin', 'legacy-brand', 'legacy-domain']),
  'helping-systems': new Set(['legacy-brand', 'legacy-domain']),
  'clinician-systems': new Set(['legacy-brand', 'legacy-domain']),
  'jobsite-systems': new Set(['legacy-brand', 'legacy-domain']),
  'smokey-hill-retrievers': new Set(['legacy-brand', 'legacy-domain']),
};

/* ---------- file walk ---------- */

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.json') || p.endsWith('.txt')) out.push(p);
  }
  return out;
}

const files = walk(brandRoot);

/* ---------- run checks ---------- */

const hits = []; // { file, checkId, label, severity, line, match }

const allowlist = BRAND_ALLOWLISTS[brandId] ?? new Set();

if (brandId !== SOURCE_BRAND) {
  for (const file of files) {
    const text = readFileSync(file, 'utf-8');
    const lines = text.split(/\r?\n/);
    for (const c of checks) {
      if (allowlist.has(c.id)) continue;
      const globalPattern = new RegExp(c.pattern.source, c.pattern.flags.includes('g') ? c.pattern.flags : c.pattern.flags + 'g');
      let m;
      while ((m = globalPattern.exec(text)) !== null) {
        // locate line number for this match
        const upTo = text.slice(0, m.index);
        const line = upTo.split(/\r?\n/).length;
        const excerpt = (lines[line - 1] ?? '').trim().slice(0, 140);
        hits.push({ file: relative(brandRoot, file).replaceAll('\\', '/'), checkId: c.id, label: c.label, severity: c.severity, line, match: m[0], excerpt });
      }
    }
  }
}

/* ---------- structural checks ---------- */

const warnings = []; // { kind, message }
const workDir = join(brandRoot, 'work');
if (existsSync(workDir)) {
  const workFiles = readdirSync(workDir).filter(f => f.endsWith('.json'));
  const arichWorkSlugs = ['coldwell-banker', 'sharp-manufacturing', 'navigate-counseling', 'global-cheer-dance', 'innovate24', 'central-comfort-air'];
  if (brandId !== SOURCE_BRAND) {
    const unchanged = workFiles.filter(f => arichWorkSlugs.includes(f.replace(/\.json$/, '')));
    if (unchanged.length > 0) {
      warnings.push({ kind: 'work-unchanged', message: `work/ still contains arich case-study files: ${unchanged.join(', ')}. Either replace with the new brand's projects or remove the folder.` });
    }
  }
}

/* Check public/assets/brands/<id>/ for leftover source-brand binary files. */
const publicBrand = join(publicRoot, brandId);
if (brandId !== SOURCE_BRAND && existsSync(publicBrand)) {
  /* Names of files known to exist in arich's public folder. If any of these
     are present in the new brand, they were cloned from the source and have
     not been replaced with brand-specific imagery. */
  const arichFiles = [
    'images/site/headshot-circle.webp',
    'images/site/headshot.webp',
    'images/site/bg-main.webp',
    'images/site/bg2.webp',
    'images/site/featured.webp',
    'images/work/coldwell-banker.jpg',
    'images/work/coldwell-banker-mockup.png',
    'images/work/sharp-manufacturing.webp',
    'images/work/sharp-manufacturing-mockup.webp',
    'images/work/navigate-counseling.webp',
    'images/work/navigate-counseling-mockup.webp',
    'images/work/global-cheer-dance.webp',
    'images/work/global-cheer-dance-mockup.webp',
    'images/work/innovate24.webp',
    'images/work/innovate24-mockup.webp',
    'images/work/central-comfort-air.webp',
    'images/work/central-comfort-air-mockup.webp',
  ];
  const stale = arichFiles.filter(f => existsSync(join(publicBrand, f)));
  if (stale.length > 0) {
    warnings.push({
      kind: 'stale-assets',
      message: `public/assets/brands/${brandId}/ contains ${stale.length} file(s) cloned from arich that look unchanged. These were copied by an older scaffold; the current scaffold omits them by default. Replace or delete: ${stale.slice(0, 5).join(', ')}${stale.length > 5 ? ` (+${stale.length - 5} more)` : ''}.`,
    });
  }
}

/* ---------- donor-vocab leak check (sibling-brand vocabulary) ----------
 *
 * Stubs restored from a non-arich donor (landscape-systems → clinician-systems
 * is a real example) leak vocab the explicit token checks above don't cover —
 * niche phrases ("landscape company"), motif words ("landscape"), brand-name
 * prefixes ("Landscape"). The fix is to derive a banned-vocab list from EACH
 * sibling brand's identity fields and grep current-brand content for matches.
 *
 * Reported as warnings (not errors): existing brands have legitimate fails to
 * triage in follow-up, and false positives on shared tokens are likely.
 *
 * Two match modes to keep noise down:
 *   - phrase     (multi-word, e.g. "landscape company"): case-insensitive
 *   - properNoun (single word from nameParts.prefix that starts uppercase
 *                 in the donor's brand.json, e.g. "Landscape"): case-SENSITIVE
 *                 so we don't flag the verb "helping" when matching the
 *                 helping-systems brand prefix "Helping".
 *
 * motifKind (single lowercase word) is intentionally NOT included: too
 * collision-prone with general English usage.
 */
const SIBLING_VOCAB_STOPLIST = new Set([
  /* Common shared tokens that are never specific to one sibling, applied
   * after lowercasing. Mostly belt-and-braces against future identity
   * fields with single-word values. */
  'systems', 'design', 'company', 'studio', 'agency',
]);

function collectSiblingVocab(brandJsonPath) {
  /* Returns array of { value, mode, origin } where mode is 'phrase' or
   * 'properNoun'. Empty array on missing/invalid brand.json. */
  if (!existsSync(brandJsonPath)) return [];
  let b;
  try { b = JSON.parse(readFileSync(brandJsonPath, 'utf-8')); } catch { return []; }
  const out = [];

  /* Multi-word niche phrases — always inclusion-worthy. Single-word niche
   * values (rare but possible) get the proper-noun treatment if uppercase. */
  for (const field of ['niche', 'nichePossessive']) {
    const v = typeof b[field] === 'string' ? b[field].trim() : '';
    if (!v) continue;
    if (/\s/.test(v)) {
      out.push({ value: v, mode: 'phrase', origin: field });
    } else if (v.length >= 5 && !SIBLING_VOCAB_STOPLIST.has(v.toLowerCase())) {
      out.push({ value: v, mode: 'phrase', origin: field });
    }
  }

  /* nameParts.prefix — capitalized brand identifier, treat as proper noun. */
  const prefix = typeof b.nameParts?.prefix === 'string' ? b.nameParts.prefix.trim() : '';
  if (prefix && prefix.length >= 5 && !SIBLING_VOCAB_STOPLIST.has(prefix.toLowerCase())) {
    /* Only flag as proper noun if the source value is capitalized. A
     * lowercase prefix would over-match common English words. */
    if (/^[A-Z]/.test(prefix)) {
      out.push({ value: prefix, mode: 'properNoun', origin: 'nameParts.prefix' });
    }
  }
  return out;
}

const currentVocabValues = new Set(
  collectSiblingVocab(join(brandRoot, 'brand.json')).map(v => v.value.toLowerCase()),
);
const siblingDirs = readdirSync(contentRoot, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== brandId && !d.name.startsWith('_'))
  .map(d => d.name);

if (brandId !== SOURCE_BRAND) {
  const fileTextCache = new Map(files.map(f => [f, readFileSync(f, 'utf-8')]));
  for (const siblingId of siblingDirs) {
    const vocab = collectSiblingVocab(join(contentRoot, siblingId, 'brand.json'));
    for (const { value, mode, origin } of vocab) {
      if (currentVocabValues.has(value.toLowerCase())) continue;
      const safe = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = mode === 'phrase' ? 'i' : '';
      const pattern = new RegExp(`\\b${safe}\\b`, flags);
      const fileHits = [];
      for (const f of files) {
        if (pattern.test(fileTextCache.get(f))) fileHits.push(relative(brandRoot, f).replaceAll('\\', '/'));
      }
      if (fileHits.length > 0) {
        warnings.push({
          kind: 'donor-vocab',
          message: `donor vocab "${value}" (${origin} of sibling brand "${siblingId}") found in ${fileHits.length} file(s): ${fileHits.slice(0, 3).join(', ')}${fileHits.length > 3 ? ` (+${fileHits.length - 3} more)` : ''}.`,
        });
      }
    }
  }
}

const faqFile = join(brandRoot, 'faq.json');
if (existsSync(faqFile)) {
  const faq = JSON.parse(readFileSync(faqFile, 'utf-8'));
  const groupIds = (faq.groups ?? []).map(g => g.id);
  const arichGroupIds = ['partnership-engagement', 'process-workflow', 'services-capabilities', 'technical-delivery', 'investment-getting-started'];
  if (brandId !== SOURCE_BRAND && groupIds.every(id => arichGroupIds.includes(id))) {
    warnings.push({ kind: 'faq-unchanged', message: `faq.json group ids match arich exactly (${groupIds.join(', ')}). Rewrite groups/questions for the new brand's domain.` });
  }
}

/* ---------- report ---------- */

const errors = hits.filter(h => h.severity === 'error');
const warnCount = hits.filter(h => h.severity === 'warn').length + warnings.length;

if (asJson) {
  console.log(JSON.stringify({ brand: brandId, errors, warnings: [...warnings, ...hits.filter(h => h.severity === 'warn')], summary: { errors: errors.length, warnings: warnCount, filesScanned: files.length } }, null, 2));
  process.exit(errors.length > 0 ? 1 : 0);
}

console.log(`brand-lint: ${brandId}`);
console.log(`  ${files.length} file(s) scanned`);
if (brandId === SOURCE_BRAND) {
  console.log(`  (token checks skipped: ${brandId} is the source brand)`);
}
if (allowlist.size > 0) {
  console.log(`  (allowlist active for ${brandId}: ${[...allowlist].join(', ')})`);
}
console.log('');

if (errors.length > 0) {
  const byFile = new Map();
  for (const h of errors) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file).push(h);
  }
  console.log(`ERRORS — arich tokens found in ${byFile.size} file(s):`);
  for (const [file, fhits] of byFile) {
    console.log(`  ${file}`);
    const seen = new Set();
    for (const h of fhits) {
      const key = `${h.checkId}:${h.match}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`    L${h.line}  [${h.checkId}]  "${h.match}"`);
    }
  }
  console.log('');
}

for (const w of warnings) {
  console.log(`WARN [${w.kind}] ${w.message}`);
}
if (warnings.length > 0) console.log('');

if (errors.length === 0 && warnings.length === 0) {
  console.log('clean: no source-brand contamination detected.');
} else {
  console.log(`summary: ${errors.length} error(s), ${warnings.length} warning(s)`);
}

/* ---------- post lint (only when posts/ exists for this brand) ----------
 * Brands with a posts/ collection get an additional schema lint via
 * scripts/lint-posts.mjs. Brands without posts/ skip this entirely so
 * legacy agency brands stay unaffected. The post-lint exit code is OR'd
 * with the main lint result so either failing fails the wrapper. */
let postsLintExit = 0;
if (existsSync(join(brandRoot, 'posts'))) {
  console.log('');
  try {
    execSync(`node scripts/lint-posts.mjs ${brandId}`, { stdio: 'inherit', cwd: projectRoot });
  } catch (e) {
    postsLintExit = (e && typeof e.status === 'number') ? e.status : 1;
  }
}

process.exit((errors.length > 0 || postsLintExit !== 0) ? 1 : 0);
