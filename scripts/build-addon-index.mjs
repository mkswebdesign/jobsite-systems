#!/usr/bin/env node
/**
 * Post-build: emit dist/assets/addons/index.json — the source of truth the in-page
 * editor reads to render its Addons panel (enable/disable list per brand).
 *
 * Shape:
 *   {
 *     "brand": "<active-brand>",
 *     "generatedAt": "<iso8601>",
 *     "addons": [
 *       {
 *         "name": "announcement-bar",
 *         "description": "<first line of README.md, if present>",
 *         "hasConfig": true,            // addon has meta[] or json[] in site.json
 *         "enabled": true,
 *         "assets": { "css": ["…"], "js": ["…"] },
 *         "modifiedAt": "<iso8601 of latest source-file mtime>",
 *         "sizeBytes": 1234              // total bytes across css + js assets
 *       },
 *       …
 *     ]
 *   }
 *
 * Addons present in public/assets/addons/ but NOT declared in the brand's site.json
 * are listed with `enabled: false`, so the editor can surface them for activation.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const brand = process.env.BRAND || 'arich';
const addonsDir = join(projectRoot, 'public', 'assets', 'addons');
const brandSiteJson = join(projectRoot, '..', 'arich-source', 'content', 'brands', brand, 'site.json');
const outDir = join(projectRoot, 'dist', 'assets', 'addons');
const outFile = join(outDir, 'index.json');

if (!existsSync(addonsDir)) process.exit(0);
if (!existsSync(outDir)) process.exit(0); // no dist/assets/addons yet (first build edge)

function firstLine(text) {
  const trimmed = text.replace(/^#\s*/, '').trim();
  const nl = trimmed.indexOf('\n');
  return nl === -1 ? trimmed.slice(0, 240) : trimmed.slice(0, nl).slice(0, 240);
}

function readDescription(addonFolder) {
  const readme = join(addonFolder, 'README.md');
  if (!existsSync(readme)) return null;
  try {
    const txt = readFileSync(readme, 'utf-8');
    // Strip front-matter if present
    const stripped = txt.startsWith('---') ? txt.replace(/^---[\s\S]*?---\s*/, '') : txt;
    // First non-empty line that isn't a top-level heading equivalent to the name
    const lines = stripped.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // Skip an H1 if it's just the addon name, take the first paragraph after
    let startIdx = 0;
    if (lines[0]?.startsWith('# ')) startIdx = 1;
    return firstLine(lines[startIdx] || '');
  } catch {
    return null;
  }
}

function collectStats(addonFolder, manifest) {
  let latestMtime = 0;
  let sizeBytes = 0;
  const check = (rel, countSize) => {
    const p = join(addonFolder, rel);
    if (!existsSync(p)) return;
    try {
      const st = statSync(p);
      if (st.mtimeMs > latestMtime) latestMtime = st.mtimeMs;
      if (countSize) sizeBytes += st.size;
    } catch {}
  };
  check('addon.json', false);
  check('README.md', false);
  for (const f of manifest.assets?.css ?? []) check(f, true);
  for (const f of manifest.assets?.js ?? []) check(f, true);
  return {
    modifiedAt: latestMtime ? new Date(latestMtime).toISOString() : null,
    sizeBytes,
  };
}

const siteEntries = (() => {
  if (!existsSync(brandSiteJson)) return {};
  try {
    const parsed = JSON.parse(readFileSync(brandSiteJson, 'utf-8'));
    return parsed.addons ?? {};
  } catch {
    return {};
  }
})();

const addons = [];
for (const entry of readdirSync(addonsDir)) {
  const addonFolder = join(addonsDir, entry);
  if (!statSync(addonFolder).isDirectory()) continue;
  const manifestPath = join(addonFolder, 'addon.json');
  if (!existsSync(manifestPath)) continue; // unmanifested folder — skip (surface in build audit, not editor)
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch {
    continue;
  }
  const siteEntry = siteEntries[entry];
  const stats = collectStats(addonFolder, manifest);
  const config = {
    meta: Array.isArray(siteEntry?.meta) ? siteEntry.meta : [],
    json: Array.isArray(siteEntry?.json) ? siteEntry.json : [],
  };
  // Schema from the manifest — drives the Configure modal's typed inputs.
  // Shape: { meta: [{ name, default, enum, attrs: { "data-x": { type, enum, min, max, description } } }, ...],
  //          data: [{ selector, fields: { ... } }, ...] }
  const configSchema = (manifest.config && typeof manifest.config === 'object')
    ? {
        meta: Array.isArray(manifest.config.meta) ? manifest.config.meta : [],
        data: Array.isArray(manifest.config.data) ? manifest.config.data : [],
        json: Array.isArray(manifest.config.json) ? manifest.config.json : [],
      }
    : null;
  addons.push({
    name: entry,
    description: readDescription(addonFolder),
    enabled: !!(siteEntry && siteEntry.enabled),
    hasConfig: !!(config.meta.length || config.json.length || (configSchema && (configSchema.meta.length || configSchema.data.length || configSchema.json.length))),
    assets: manifest.assets ?? { css: [], js: [] },
    modifiedAt: stats.modifiedAt,
    sizeBytes: stats.sizeBytes,
    hasReadme: existsSync(join(addonFolder, 'README.md')),
    config,
    configSchema,
  });
}

addons.sort((a, b) => a.name.localeCompare(b.name));

const out = {
  brand,
  generatedAt: new Date().toISOString(),
  addons,
};

writeFileSync(outFile, JSON.stringify(out, null, 2));
const enabledCount = addons.filter((a) => a.enabled).length;
console.log(`addon index: ${addons.length} addons (${enabledCount} enabled) for brand=${brand}`);
