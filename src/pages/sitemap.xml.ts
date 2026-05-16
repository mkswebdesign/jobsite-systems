import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { brand } from '../builder/lib/brand';

/** Page slugs that exist in the pages collection but should NOT be indexed:
 *   - internal-fork / internal-fork/options: unlisted intentionally
 *   - contact/success / onboard/success / support/success: thank-you targets
 *   - onboard / support: hidden client onboarding/support intakes
 *   - search: noindex by design (Pass 3)
 */
const EXCLUDED_PAGE_PATHS = new Set<string>([
  '/internal-fork/',
  '/internal-fork/options/',
  '/contact/success/',
  '/onboard/',
  '/onboard/success/',
  '/support/',
  '/support/success/',
  '/search/',
]);

const PAGE_SIZE = 12;

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

function xmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
}

function emit(u: UrlEntry): string {
  const parts = [`<loc>${xmlEscape(u.loc)}</loc>`];
  if (u.lastmod) parts.push(`<lastmod>${u.lastmod}</lastmod>`);
  if (u.changefreq) parts.push(`<changefreq>${u.changefreq}</changefreq>`);
  if (u.priority != null) parts.push(`<priority>${u.priority.toFixed(1)}</priority>`);
  return `  <url>${parts.join('')}</url>`;
}

export const GET: APIRoute = async () => {
  const origin = brand.url.replace(/\/$/, '');
  const urls: UrlEntry[] = [];
  const seen = new Set<string>();

  function push(path: string, meta: Omit<UrlEntry, 'loc'> = {}) {
    if (EXCLUDED_PAGE_PATHS.has(path)) return;
    const normalized = path === '/' ? '/' : (path.endsWith('/') ? path : `${path}/`);
    const loc = `${origin}${normalized}`;
    if (seen.has(loc)) return;
    seen.add(loc);
    urls.push({ loc, ...meta });
  }

  /* Static pages (existing). Homepage gets priority 1.0 / daily;
   * standard interior pages get 0.5 / yearly. */
  const pages = await getCollection('pages');
  for (const p of pages) {
    const path = p.data.path;
    const isHome = path === '/';
    push(path, isHome
      ? { changefreq: 'daily', priority: 1.0 }
      : { changefreq: 'yearly', priority: 0.5 });
  }

  /* Services + work (legacy for swift-digest, primary for sibling agency
   * brands). Don't add a global exclusion for these — sibling brands depend
   * on them. Pass 4 will move swift-digest's source files into _legacy/,
   * which empties the collections for swift-digest and excludes the URLs
   * from this loop automatically. */
  const services = await getCollection('services');
  for (const s of services) push(`/services/${s.data.slug}/`, { changefreq: 'monthly', priority: 0.6 });

  const work = await getCollection('work');
  for (const w of work) push(`/work/${w.data.slug}/`, { changefreq: 'monthly', priority: 0.6 });

  /* best-by-year (best-futbol only) — gated on the brand having a /best/ page. */
  if (await getEntry('pages', 'best')) {
    try {
      const bestByYear = await getCollection('bestByYear');
      push('/best/', { changefreq: 'yearly', priority: 0.6 });
      for (const t of bestByYear) push(`/best/${t.data.year}/${t.data.slug}/`, { changefreq: 'yearly', priority: 0.5 });
    } catch {
      /* no best-by-year for this brand */
    }
  }

  /* Blog routes (Pass 3 additions). All gracefully no-op for brands without
   * a posts collection — the loops simply iterate empty arrays.
   * `publishAt` drip gate: future-scheduled posts stay out of the sitemap
   * until their build runs after the publishAt timestamp. */
  const now = Date.now();
  const allPosts = await getCollection('posts').catch(() => [] as any[]);
  const publishedPosts = allPosts.filter((p: any) =>
    p.data.status === 'published' &&
    (!p.data.publishAt || +new Date(p.data.publishAt) <= now)
  );

  if (publishedPosts.length > 0) {
    /* /archive/ + paginated children */
    push('/archive/', { changefreq: 'daily', priority: 0.8 });
    const archivePages = Math.ceil(publishedPosts.length / PAGE_SIZE);
    for (let n = 2; n <= archivePages; n++) {
      push(`/archive/page/${n}/`, { changefreq: 'daily', priority: 0.7 });
    }
  }

  const allCategories = await getCollection('categories').catch(() => [] as any[]);
  if (allCategories.length > 0) {
    push('/category/', { changefreq: 'weekly', priority: 0.8 });
    for (const c of allCategories) {
      const slug = c.data.slug;
      const matching = publishedPosts.filter((p: any) => p.data.category === c.data.id);
      push(`/category/${slug}/`, { changefreq: 'daily', priority: 0.8 });
      const pages = Math.ceil(matching.length / PAGE_SIZE);
      for (let n = 2; n <= pages; n++) {
        push(`/category/${slug}/page/${n}/`, { changefreq: 'daily', priority: 0.7 });
      }
    }
  }

  /* Derived tags from published posts. */
  const tagCounts = new Map<string, number>();
  for (const p of publishedPosts) {
    for (const t of (p.data.tags ?? [])) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  for (const [tag, count] of tagCounts) {
    push(`/tag/${tag}/`, { changefreq: 'weekly', priority: 0.6 });
    const pages = Math.ceil(count / PAGE_SIZE);
    for (let n = 2; n <= pages; n++) {
      push(`/tag/${tag}/page/${n}/`, { changefreq: 'weekly', priority: 0.5 });
    }
  }

  /* Per-post URLs — published only. lastmod from updated || date. */
  for (const p of publishedPosts) {
    const lastmod = (p.data.updated ?? p.data.date).toISOString().slice(0, 10);
    push(`/post/${p.data.slug}/`, { lastmod, changefreq: 'monthly', priority: 0.7 });
  }

  /* Stable order. */
  urls.sort((a, b) => a.loc.localeCompare(b.loc));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(emit).join('\n')}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
