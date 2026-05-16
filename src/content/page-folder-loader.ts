import type { Loader } from 'astro/loaders';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Custom loader for the `pages` collection. Supports two on-disk shapes
 * simultaneously so brands can migrate one page at a time:
 *
 *   Flat (legacy):         pages/<slug>.json
 *   Folder (portable):     pages/<slug>/page.json + sections/<NN>-<type>.json
 *
 * In the folder shape, `sections` may contain strings (relative paths into
 * the page folder) that the loader resolves into the inline section objects
 * the downstream Zod schema expects. Pages without a `sections` array (e.g.
 * interior pages that use named composition keys via `.passthrough()`) are
 * passed through untouched.
 *
 * Folder shape wins over flat shape on slug collision — allows a brand to
 * migrate one page at a time without deleting the original in the same PR.
 */
export function pageFolderLoader(baseDir: string): Loader {
  return {
    name: 'page-folder-loader',
    async load({ store, parseData, logger }) {
      store.clear();

      if (!existsSync(baseDir)) {
        logger.warn(`pages directory not found: ${baseDir}`);
        return;
      }

      const entries = await readdir(baseDir, { withFileTypes: true });
      const loadedSlugs = new Set<string>();

      for (const dirent of entries) {
        if (!dirent.isDirectory()) continue;
        const slug = dirent.name;
        const pageJsonPath = path.join(baseDir, slug, 'page.json');
        if (!existsSync(pageJsonPath)) continue;

        try {
          const raw = await readFile(pageJsonPath, 'utf-8');
          const page = JSON.parse(raw);
          await resolveSectionRefs(page, path.join(baseDir, slug));
          const data = await parseData({ id: slug, data: page, filePath: pageJsonPath });
          store.set({ id: slug, data, filePath: pageJsonPath });
          loadedSlugs.add(slug);
        } catch (err) {
          logger.error(`failed to load folder-format page '${slug}': ${(err as Error).message}`);
          throw err;
        }
      }

      for (const dirent of entries) {
        if (!dirent.isFile()) continue;
        if (!dirent.name.endsWith('.json')) continue;
        const slug = dirent.name.replace(/\.json$/, '');
        if (loadedSlugs.has(slug)) continue;

        const filePath = path.join(baseDir, dirent.name);
        try {
          const raw = await readFile(filePath, 'utf-8');
          const page = JSON.parse(raw);
          const data = await parseData({ id: slug, data: page, filePath });
          store.set({ id: slug, data, filePath });
        } catch (err) {
          logger.error(`failed to load flat-format page '${slug}': ${(err as Error).message}`);
          throw err;
        }
      }
    },
  };
}

async function resolveSectionRefs(page: Record<string, unknown>, pageDir: string): Promise<void> {
  const sections = page.sections;
  if (!Array.isArray(sections)) return;

  const resolved = await Promise.all(
    sections.map(async (entry, index) => {
      if (typeof entry === 'string') {
        const secPath = path.resolve(pageDir, entry);
        const rel = path.relative(pageDir, secPath);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          throw new Error(`section reference escapes page folder: '${entry}' at index ${index}`);
        }
        const secRaw = await readFile(secPath, 'utf-8');
        return JSON.parse(secRaw);
      }
      return entry;
    })
  );

  page.sections = resolved;
}
