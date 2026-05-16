import type { Loader } from 'astro/loaders';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Testimonials loader — merges main-brand + per-demo testimonials.
 *
 * Layout on disk:
 *   <contentRoot>/testimonials.json                       (main brand, ids as-authored)
 *   <contentRoot>/demos/<demo>/testimonials.json          (per demo, ids namespaced as `demos/<demo>/<id>`)
 *
 * Why namespace demo ids: the main-brand homepage falls back to
 * `featured: true` filtering when a Testimonials section ships no
 * explicit ids, and we don't want a demo's featured quotes leaking
 * into the brand surface. The id prefix gives Testimonials.astro a
 * cheap way to exclude demo entries from that fallback.
 *
 * Demo pages reference these via the natural authored id; the demo
 * catch-all route ([demo]/[...slug].astro) prefixes the id at render
 * time so demo page authors don't need to know about the namespace.
 */
export function testimonialsLoader(contentRoot: string): Loader {
  return {
    name: 'testimonials-loader',
    async load({ store, parseData, logger }) {
      store.clear();

      const mainPath = path.join(contentRoot, 'testimonials.json');
      if (existsSync(mainPath)) {
        try {
          const arr = JSON.parse(await readFile(mainPath, 'utf-8'));
          if (Array.isArray(arr)) {
            for (const t of arr) {
              if (!t || typeof t !== 'object' || typeof t.id !== 'string') continue;
              const data = await parseData({ id: t.id, data: t, filePath: mainPath });
              store.set({ id: t.id, data, filePath: mainPath });
            }
          }
        } catch (err) {
          logger.error(`failed to load main testimonials: ${(err as Error).message}`);
          throw err;
        }
      }

      const demosBase = path.join(contentRoot, 'demos');
      if (!existsSync(demosBase)) return;
      for (const entry of readdirSync(demosBase)) {
        const demoDir = path.join(demosBase, entry);
        if (!statSync(demoDir).isDirectory()) continue;
        const demoTestimonials = path.join(demoDir, 'testimonials.json');
        if (!existsSync(demoTestimonials)) continue;
        try {
          const arr = JSON.parse(await readFile(demoTestimonials, 'utf-8'));
          if (!Array.isArray(arr)) continue;
          for (const t of arr) {
            if (!t || typeof t !== 'object' || typeof t.id !== 'string') continue;
            const namespacedId = `demos/${entry}/${t.id}`;
            const transformed = { ...t, id: namespacedId };
            const data = await parseData({ id: namespacedId, data: transformed, filePath: demoTestimonials });
            store.set({ id: namespacedId, data, filePath: demoTestimonials });
          }
        } catch (err) {
          logger.error(`failed to load demo testimonials at ${demoTestimonials}: ${(err as Error).message}`);
          throw err;
        }
      }
    },
  };
}
