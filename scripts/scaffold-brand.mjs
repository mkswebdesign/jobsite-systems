#!/usr/bin/env node
/**
 * Scaffold a new brand by cloning a source brand or a starter template.
 *
 * Usage:
 *   node scripts/scaffold-brand.mjs <brand-id> [--source=arich] [--template=<name>] [--with-assets] [--config=<path>]
 *
 * Creates:
 *   ../arich-source/content/brands/<brand-id>/   (content JSONs, rewritten image paths)
 *   public/assets/brands/<brand-id>/             (directory; empty unless --with-assets)
 *
 * --config=<path-to-json>:
 *   Identity values (name, tagline, owner, domain, schemaOrganization, etc.) get
 *   written into brand.json after the path-rewrite + image-null passes complete.
 *   Without --config, brand.json identity stays as donor values (current behavior).
 *   Without this, every fork pays ~30 minutes of manual identity replacement.
 *   See IDENTITY_FIELDS below for the recognized schema.
 *
 * Source selection:
 *   --template=<name>   clone from `brands/_templates/<name>/` (niche-specific
 *                       starter, e.g. `service-business`). Preferred for new
 *                       brands so you don't start from arich's design-agency voice.
 *   --source=<id>       clone from `brands/<id>/` (another real brand). Default
 *                       is `arich`.
 *   --template takes precedence over --source when both are provided.
 *
 * Default behavior (no --with-assets):
 *   - Binary assets from the source's public folder are NOT copied.
 *     A fresh brand starts without the source's headshot, favicons,
 *     og-image, or work-screenshot files. brand.json local image paths
 *     (owner.headshot, assets.favicon, assets.favicon32, assets.appleTouchIcon,
 *     assets.ogImage) are rewritten to null so the build doesn't 404 on
 *     non-existent files. Unsplash URLs in brand.json remain intact — they
 *     are generic enough to work across niches until the user swaps them.
 *
 * --with-assets:
 *   - Copies the source's public folder verbatim, rewrites `/assets/brands/<source>/`
 *     paths to `/assets/brands/<brand-id>/`. Only applies to --source (templates have
 *     no binary assets).
 *
 * The copied content still has source copy in it — the generator skill
 * (or you manually) replaces placeholder slots with business-specific content.
 */
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const contentRoot = join(projectRoot, '..', 'arich-source', 'content', 'brands');
const publicRoot = join(projectRoot, 'public', 'assets', 'brands');

const args = process.argv.slice(2);
const brandId = args.find(a => !a.startsWith('--'));
const sourceArg = args.find(a => a.startsWith('--source='));
const templateArg = args.find(a => a.startsWith('--template='));
const configArg = args.find(a => a.startsWith('--config='));
const sourceBrand = sourceArg ? sourceArg.split('=')[1] : 'arich';
const templateName = templateArg ? templateArg.split('=')[1] : null;
const withAssets = args.includes('--with-assets');
const configPath = configArg ? configArg.split('=')[1] : null;

if (!brandId) {
  console.error('Usage: node scripts/scaffold-brand.mjs <brand-id> [--source=arich]');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(brandId)) {
  console.error(`Brand ID must be lowercase kebab-case: ${brandId}`);
  process.exit(1);
}

const srcContent = templateName
  ? join(contentRoot, '_templates', templateName)
  : join(contentRoot, sourceBrand);
const dstContent = join(contentRoot, brandId);
const srcPublic = join(publicRoot, sourceBrand);
const dstPublic = join(publicRoot, brandId);
const sourceLabel = templateName ? `_templates/${templateName}` : sourceBrand;

if (!existsSync(srcContent)) {
  if (templateName) {
    console.error(`Template not found: ${srcContent}`);
    console.error(`Available templates: ${existsSync(join(contentRoot, '_templates')) ? readdirSync(join(contentRoot, '_templates')).join(', ') : '(none)'}`);
  } else {
    console.error(`Source brand content not found: ${srcContent}`);
  }
  process.exit(1);
}
if (existsSync(dstContent)) {
  console.error(`Brand already exists: ${dstContent}`);
  process.exit(1);
}

function copyRecursive(src, dst) {
  const stat = statSync(src);
  if (stat.isDirectory()) {
    mkdirSync(dst, { recursive: true });
    for (const entry of readdirSync(src)) {
      copyRecursive(join(src, entry), join(dst, entry));
    }
  } else {
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
  }
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

copyRecursive(srcContent, dstContent);

/* Templates never have companion binary assets, so --with-assets only applies
   when cloning from a real source brand. */
if (withAssets && !templateName) {
  if (existsSync(srcPublic)) copyRecursive(srcPublic, dstPublic);
} else {
  mkdirSync(dstPublic, { recursive: true });
}

const sourcePathPrefix = templateName
  ? `/assets/brands/_templates/${templateName}/`
  : `/assets/brands/${sourceBrand}/`;
const destPathPrefix = `/assets/brands/${brandId}/`;
let rewritten = 0;
for (const file of walk(dstContent)) {
  if (!file.endsWith('.json') && !file.endsWith('.txt')) continue;
  const text = readFileSync(file, 'utf-8');
  if (text.includes(sourcePathPrefix)) {
    writeFileSync(file, text.split(sourcePathPrefix).join(destPathPrefix));
    rewritten++;
  }
}

/* ---------- null-out local image references when --with-assets is not set ---------- */

/**
 * When binary assets aren't cloned, brand.json still references file paths that
 * don't exist in the new brand's public folder. Rewrite those specific slots to
 * null so components' `{headshot && ...}` guards skip them instead of emitting
 * <img src="/assets/brands/<id>/images/..."> that 404 at runtime.
 *
 * Unsplash URLs (assets.heroBackgroundImage etc.) are preserved — they're
 * generic and not tied to the source brand's private assets.
 */
let nulled = 0;
if (!withAssets) {
  const brandJsonPath = join(dstContent, 'brand.json');
  if (existsSync(brandJsonPath)) {
    const b = JSON.parse(readFileSync(brandJsonPath, 'utf-8'));
    const imageSlots = [
      ['owner', 'headshot'],
      ['assets', 'headshot'],
      ['assets', 'favicon'],
      ['assets', 'favicon32'],
      ['assets', 'appleTouchIcon'],
      ['assets', 'ogImage'],
    ];
    for (const [parent, key] of imageSlots) {
      const v = b[parent]?.[key];
      if (typeof v === 'string' && v.startsWith(destPathPrefix)) {
        b[parent][key] = null;
        nulled++;
      }
    }
    writeFileSync(brandJsonPath, JSON.stringify(b, null, 2) + '\n');
  }

  /* Null source-brand headshot references embedded in page JSONs. These are
     paths baked into specific page sections (e.g., finalCta.headshot on home/
     process, intro.headshot on about) that were cloned from the source brand. */
  const pagesDir = join(dstContent, 'pages');
  if (existsSync(pagesDir)) {
    for (const entry of readdirSync(pagesDir)) {
      if (!entry.endsWith('.json')) continue;
      const pp = join(pagesDir, entry);
      const raw = readFileSync(pp, 'utf-8');
      const p = JSON.parse(raw);
      let changed = false;
      /* intro.headshot — about.json */
      if (typeof p.intro?.headshot === 'string') {
        p.intro.headshot = null;
        changed = true;
      }
      /* finalCta.headshot — home.json, process.json */
      if (typeof p.finalCta?.headshot === 'string') {
        p.finalCta.headshot = null;
        changed = true;
      }
      /* sections[].headshot — any homepage finalCta section in sections[] */
      if (Array.isArray(p.sections)) {
        for (const sec of p.sections) {
          if (typeof sec.headshot === 'string') {
            sec.headshot = null;
            changed = true;
          }
        }
      }
      if (changed) {
        writeFileSync(pp, JSON.stringify(p, null, 2) + '\n');
        nulled++;
      }
    }
  }

  // Clear per-work image paths; work entries for a new brand likely won't carry
  // over from the source brand. The /new-brand flow either deletes work/ entries
  // or replaces them; this just prevents broken <img> tags in the interim.
  const workDir = join(dstContent, 'work');
  if (existsSync(workDir)) {
    for (const entry of readdirSync(workDir)) {
      if (!entry.endsWith('.json')) continue;
      const wp = join(workDir, entry);
      const w = JSON.parse(readFileSync(wp, 'utf-8'));
      let changed = false;
      if (typeof w.image === 'string' && w.image.startsWith(destPathPrefix)) { w.image = null; changed = true; }
      if (changed) {
        writeFileSync(wp, JSON.stringify(w, null, 2) + '\n');
        nulled++;
      }
    }
  }
}

/* ---------- identity rewrite (opt-in via --config) ----------
 *
 * Without this pass, every fork ships with donor identity (name, tagline,
 * owner, domain, schema). The /new-brand flow used to fix that by hand —
 * fragile and slow. With --config=<json> the caller declares the identity
 * up front and the scaffold script lays it down structurally so a fresh
 * brand boots with its own metadata before content generation runs.
 *
 * Recognized fields (all optional — anything omitted falls back to donor):
 *   id, name, nameParts {prefix, accent}, tagline, description, domain,
 *   url, copyrightYear, owner {name, role, experienceYears, linkedin},
 *   contact {email, emailAlt, phone, address},
 *   social {linkedin, twitter, instagram, github},
 *   niche, nichePossessive,        // *.systems brands
 *   seo {defaultTitleSuffix, defaultDescription, schemaOrganization {name, founder, contactType}},
 *   analytics {plausibleDomain},
 *   positioning {headline, headlineAccent, badge, lead}
 *
 * Page-level copy (pages/services/work/faq/testimonials) is NOT rewritten —
 * that's the agent / brand-lint's job. This pass is only the structural
 * identity slots that brand.json itself owns.
 */
let identity = null;
if (configPath) {
  if (!existsSync(configPath)) {
    console.error(`--config: file not found: ${configPath}`);
    process.exit(1);
  }
  try {
    identity = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.error(`--config: failed to parse JSON: ${err.message}`);
    process.exit(1);
  }
}

let identityFields = 0;
if (identity) {
  const brandJsonPath = join(dstContent, 'brand.json');
  if (!existsSync(brandJsonPath)) {
    console.error(`--config: brand.json not found in scaffolded brand: ${brandJsonPath}`);
    process.exit(1);
  }
  const b = JSON.parse(readFileSync(brandJsonPath, 'utf-8'));

  /* Top-level scalar fields. Each set increments the counter so the
   * "rewrote N identity field(s)" log line reflects actual coverage. */
  for (const key of ['id', 'name', 'tagline', 'description', 'domain', 'url', 'copyrightYear', 'niche', 'nichePossessive']) {
    if (Object.prototype.hasOwnProperty.call(identity, key)) {
      b[key] = identity[key];
      identityFields++;
    }
  }

  /* nameParts is a small nested object — replace wholesale if provided. */
  if (identity.nameParts && typeof identity.nameParts === 'object') {
    b.nameParts = { ...(b.nameParts || {}), ...identity.nameParts };
    identityFields++;
  }

  /* Sub-objects that exist in donor and want partial overrides. Each
   * named key under the sub-object is merged in, leaving donor keys not
   * mentioned in the config untouched. */
  const subObjects = ['owner', 'contact', 'social', 'analytics', 'positioning'];
  for (const k of subObjects) {
    if (identity[k] && typeof identity[k] === 'object') {
      b[k] = { ...(b[k] || {}), ...identity[k] };
      identityFields++;
    }
  }

  /* SEO block — sub-fields and the schemaOrganization sub-object both
   * benefit from explicit override. */
  if (identity.seo && typeof identity.seo === 'object') {
    b.seo = b.seo || {};
    for (const k of ['defaultTitleSuffix', 'defaultDescription', 'twitterCard', 'ogType']) {
      if (Object.prototype.hasOwnProperty.call(identity.seo, k)) {
        b.seo[k] = identity.seo[k];
        identityFields++;
      }
    }
    if (identity.seo.schemaOrganization && typeof identity.seo.schemaOrganization === 'object') {
      b.seo.schemaOrganization = { ...(b.seo.schemaOrganization || {}), ...identity.seo.schemaOrganization };
      identityFields++;
    }
  }

  writeFileSync(brandJsonPath, JSON.stringify(b, null, 2) + '\n');
}

console.log(`scaffolded: ${brandId} (from ${sourceLabel})`);
console.log(`  content: ${relative(projectRoot, dstContent)}`);
console.log(`  public:  ${relative(projectRoot, dstPublic)}${withAssets ? '' : ' (empty — no binary assets cloned)'}`);
console.log(`  path refs rewritten in ${rewritten} file(s)`);
if (!withAssets) console.log(`  local image paths nulled: ${nulled}`);
if (identity) console.log(`  identity fields rewritten in brand.json: ${identityFields}`);
console.log('');
console.log('Next: edit brand.json + pages/services/work/faq/testimonials/llms.txt to match the business.');
if (!withAssets) {
  console.log(`Imagery: headshot/favicon/ogImage default to null. Drop real files into public/assets/brands/${brandId}/`);
  console.log(`and fill in the paths in brand.json when ready. (To clone source-brand imagery as placeholder, re-run with --with-assets.)`);
}
console.log(`Smoke test: BRAND=${brandId} npm run build:fast`);
