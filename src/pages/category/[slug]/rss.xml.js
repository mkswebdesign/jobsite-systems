/**
 * Per-category RSS feed: /category/<slug>/rss.xml
 * Filters published posts to one category. Empty feed for categories with
 * zero posts (still valid RSS 2.0 — feed validators pass).
 *
 * getStaticPaths returns [] when the active brand has no categories so
 * sibling brands without a posts collection skip these routes entirely.
 */
import rss from '@astrojs/rss';
import { brand } from '../../../builder/lib/brand';
import { getAllCategories, getPostsByCategory } from '../../../builder/lib/posts';

export async function getStaticPaths() {
  const cats = await getAllCategories();
  return cats.map((c) => ({ params: { slug: c.data.slug }, props: { category: c } }));
}

export async function GET(context) {
  const category = context.props.category;
  const c = category.data;
  const posts = await getPostsByCategory(c.id);
  const site = context.site ?? new URL(brand.url).origin;
  return rss({
    title: `${c.name} — ${brand.name}`,
    description: c.description,
    site,
    items: posts.slice(0, 50).map((p) => ({
      title: p.data.title,
      link: `/post/${p.data.slug}/`,
      description: p.data.excerpt,
      pubDate: p.data.date,
      categories: [p.data.category, ...p.data.tags],
      customData: `<guid isPermaLink="true">${brand.url.replace(/\/$/, '')}/post/${p.data.slug}/</guid>`,
    })),
    customData: `<language>${brand.locale ?? 'en-us'}</language>`,
  });
}
