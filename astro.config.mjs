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

export default defineConfig({
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
