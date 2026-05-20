import { defineConfig } from 'astro/config';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const brand = process.env.BRAND || 'arich';
const arichSource = existsSync(join(__dirname, 'arich-source')) ? join(__dirname, 'arich-source') : join(__dirname, '..', 'arich-source');
const brandJsonPath = join(arichSource, 'content', 'brands', brand, 'brand.json');
const brandData = JSON.parse(readFileSync(brandJsonPath, 'utf-8'));

/* Content-hash the editor bootstrap so its <script src> URL changes whenever
 * the file changes. Prevents mobile Safari from serving a stale cached copy
 * across deploys — the bug that killed the editor for ~a day post-reorg. */
function fileHash(relPath) {
  try {
    return createHash('md5').update(readFileSync(join(__dirname, relPath))).digest('hex').slice(0, 10);
  } catch {
    return 'dev';
  }
}
const BOOTSTRAP_HASH = fileHash('public/assets/builder/editor/bootstrap.js');
const MAIN_HASH = fileHash('public/assets/builder/main.js');
const THEME_HASH = fileHash('public/assets/builder/theme/theme.js');

/* Post-build index generators (theme palette, addons, search, redirects) live
 * in scripts/ and are normally run by run-build.mjs AFTER `astro build`. But
 * the live host (xCloud) invokes `astro build` directly, so those steps never
 * ran on deploy — the in-page editor's Theme panel had no /assets/theme/
 * index.json to load (and search.json / addons index were likewise missing).
 * Running them in `astro:build:done` makes them part of the build itself, so
 * they ship regardless of the invoking command. Each is isolated in try/catch
 * so a generator hiccup can never fail the deploy. (Under `npm run build` they
 * also run again afterward — harmless, idempotent regeneration.) */
function postBuildIndexes() {
  return {
    name: 'post-build-indexes',
    hooks: {
      'astro:build:done': async ({ logger }) => {
        const { execFileSync } = await import('node:child_process');
        const scripts = ['build-redirects.mjs', 'build-search-index.mjs', 'build-addon-index.mjs', 'build-theme-index.mjs'];
        for (const s of scripts) {
          try {
            execFileSync(process.execPath, [join(__dirname, 'scripts', s)], {
              stdio: 'inherit',
              env: { ...process.env, BRAND: brand },
            });
          } catch (err) {
            (logger?.warn ?? console.warn)(`[post-build-indexes] ${s} failed: ${err.message}`);
          }
        }
      },
    },
  };
}

export default defineConfig({
  integrations: [postBuildIndexes()],
  site: brandData.url,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    assets: 'assets/_astro',
  },
  vite: {
    define: {
      'import.meta.env.PUBLIC_BRAND': JSON.stringify(brand),
      'import.meta.env.PUBLIC_BOOTSTRAP_HASH': JSON.stringify(BOOTSTRAP_HASH),
      'import.meta.env.PUBLIC_MAIN_HASH': JSON.stringify(MAIN_HASH),
      'import.meta.env.PUBLIC_THEME_HASH': JSON.stringify(THEME_HASH),
    },
  },
});
