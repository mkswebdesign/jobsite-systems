import type { Loader } from 'astro/loaders';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Custom loader for the `demoPages` collection — mirrors `pageFolderLoader`
 * but walks demos/<demo>/pages/<slug> (one extra path segment for the demo
 * id) and emits entries with composite ids `<demo>/<slug>`.
 *
 * Layout on disk:
 *   <baseDir>/<demo>/pages/<slug>/page.json   (folder format with sections/)
 *   <baseDir>/<demo>/pages/<slug>.json        (flat format, legacy)
 *
 * The shape of each <slug> matches the production `pages` loader exactly,
 * so demo pages share schemas + components with production. The difference
 * is purely the URL prefix (/demo/<demo>/) and the content tree.
 *
 * Used by the catch-all route src/pages/demo/[demo]/[...slug].astro to
 * enumerate routes and dispatch render by section type.
 */
export function demoFolderLoader(baseDir: string): Loader {
  return {
    name: 'demo-folder-loader',
    async load({ store, parseData, logger }) {
      store.clear();

      if (!existsSync(baseDir)) {
        // No demos for this brand — that's fine, just return empty.
        return;
      }

      const demos = await readdir(baseDir, { withFileTypes: true });
      for (const demoDir of demos) {
        if (!demoDir.isDirectory()) continue;
        const demoId = demoDir.name;
        const pagesDir = path.join(baseDir, demoId, 'pages');
        if (!existsSync(pagesDir)) continue;

        const entries = await readdir(pagesDir, { withFileTypes: true });
        const loadedSlugs = new Set<string>();

        for (const dirent of entries) {
          if (!dirent.isDirectory()) continue;
          const slug = dirent.name;
          const pageJsonPath = path.join(pagesDir, slug, 'page.json');
          if (!existsSync(pageJsonPath)) continue;

          try {
            const raw = await readFile(pageJsonPath, 'utf-8');
            const page = JSON.parse(raw);
            await resolveSectionRefs(page, path.join(pagesDir, slug));
            const id = `${demoId}/${slug}`;
            const data = await parseData({ id, data: page, filePath: pageJsonPath });
            store.set({ id, data, filePath: pageJsonPath });
            loadedSlugs.add(slug);
          } catch (err) {
            logger.error(`failed to load demo folder-format page '${demoId}/${slug}': ${(err as Error).message}`);
            throw err;
          }
        }

        for (const dirent of entries) {
          if (!dirent.isFile()) continue;
          if (!dirent.name.endsWith('.json')) continue;
          const slug = dirent.name.replace(/\.json$/, '');
          if (loadedSlugs.has(slug)) continue;

          const filePath = path.join(pagesDir, dirent.name);
          try {
            const raw = await readFile(filePath, 'utf-8');
            const page = JSON.parse(raw);
            const id = `${demoId}/${slug}`;
            const data = await parseData({ id, data: page, filePath });
            store.set({ id, data, filePath });
          } catch (err) {
            logger.error(`failed to load demo flat-format page '${demoId}/${slug}': ${(err as Error).message}`);
            throw err;
          }
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
