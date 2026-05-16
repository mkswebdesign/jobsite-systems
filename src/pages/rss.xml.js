/**
 * Site-wide RSS feed for the active brand's published posts (newest 50).
 * Brand-aware: title/description/site come from brand.{name,description,url}.
 * For brands without a posts collection, emits a valid RSS 2.0 doc with zero
 * items rather than 404'ing — feed validators stay green.
 */
import rss from '@astrojs/rss';
import { brand } from '../builder/lib/brand';
import { getAllPosts } from '../builder/lib/posts';

export async function GET(context) {
  const posts = await getAllPosts();
  const site = context.site ?? new URL(brand.url).origin;
  return rss({
    title: brand.name,
    description: brand.description ?? brand.tagline ?? brand.name,
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
