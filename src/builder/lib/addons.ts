/**
 * Addon resolver — reads the per-brand addons map from site.json and
 * matches each enabled entry against its public/assets/addons/<name>/addon.json
 * manifest. Returns an ordered list ready for Base.astro to emit.
 *
 * Iteration order of the `addons` object in site.json is preserved (modern JS
 * maintains insertion order), which is the order tags appear in the HTML.
 * CSS cascade and script execution both follow that order.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { site, type AddonMetaConfig, type AddonJsonConfig } from './brand';
import { publicAssetUrl } from './asset-hash';

const ADDONS_ROOT = join(process.cwd(), 'public', 'assets', 'addons');

interface AddonManifest {
  name: string;
  assets: { css: string[]; js: string[] };
  /** Extra attributes applied to every <link> emitted for this addon's CSS. Used by print-mode to set media="print". */
  cssAttrs?: Record<string, string>;
}

export interface ResolvedAddon {
  name: string;
  cssHrefs: string[];
  cssAttrs: Record<string, string>;
  jsSrcs: string[];
  meta: AddonMetaConfig[];
  json: AddonJsonConfig[];
}

function loadManifest(name: string): AddonManifest {
  const path = join(ADDONS_ROOT, name, 'addon.json');
  if (!existsSync(path)) {
    throw new Error(
      `Addon manifest not found: ${path}. ` +
      `site.json enables addon "${name}" but public/assets/addons/${name}/addon.json does not exist.`
    );
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as AddonManifest;
}

export function getEnabledAddons(): ResolvedAddon[] {
  const addons = site.addons ?? {};
  const out: ResolvedAddon[] = [];
  for (const [name, entry] of Object.entries(addons)) {
    if (!entry.enabled) continue;
    const manifest = loadManifest(name);
    out.push({
      name,
      cssHrefs: manifest.assets.css.map((f) => publicAssetUrl(`/assets/addons/${name}/${f}`)),
      cssAttrs: manifest.cssAttrs ?? {},
      jsSrcs: manifest.assets.js.map((f) => publicAssetUrl(`/assets/addons/${name}/${f}`)),
      meta: entry.meta ?? [],
      json: entry.json ?? [],
    });
  }
  return out;
}
