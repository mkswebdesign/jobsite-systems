/**
 * Post / category / author / tag helpers for the blog routes.
 *
 * All functions safely return [] / null when the active brand has no posts
 * collection or no categories/authors files. The Astro content collection
 * loaders for these are empty-loader stubs in that case (see config.ts).
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type Category = CollectionEntry<'categories'>;
export type Author = CollectionEntry<'authors'>;

const READING_WPM = 220;

/** Drip-publish gate. When `publishAt` is set on a post and is in the future
 *  relative to the current build time, the post is hidden from all reader-
 *  facing surfaces. Each scheduled rebuild re-evaluates this so posts
 *  surface automatically once their publishAt has passed. Posts without
 *  `publishAt` are always considered ready (immediate publish). */
function isDue(p: Post, now = Date.now()): boolean {
  return !p.data.publishAt || +p.data.publishAt <= now;
}

export async function getAllPosts(): Promise<Post[]> {
  const all = await getCollection('posts').catch(() => [] as Post[]);
  return all
    .filter((p) => p.data.status === 'published' && isDue(p))
    .sort((a, b) => +b.data.date - +a.data.date);
}

/** Published + archived. Used by /post/[slug].astro's getStaticPaths so
 *  archived URLs still resolve at their direct URL (just hidden from lists).
 *  Drip gate still applies — a future-dated post is not yet "visible" anywhere. */
export async function getAllVisiblePosts(): Promise<Post[]> {
  const all = await getCollection('posts').catch(() => [] as Post[]);
  return all
    .filter((p) => (p.data.status === 'published' || p.data.status === 'archived') && isDue(p))
    .sort((a, b) => +b.data.date - +a.data.date);
}

export async function getPostsByCategory(slug: string): Promise<Post[]> {
  const all = await getAllPosts();
  return all.filter((p) => p.data.category === slug);
}

export async function getPostsByTag(slug: string): Promise<Post[]> {
  const all = await getAllPosts();
  return all.filter((p) => p.data.tags.includes(slug));
}

export async function getAllCategories(): Promise<Category[]> {
  const all = await getCollection('categories').catch(() => [] as Category[]);
  return all.slice().sort((a, b) => a.data.order - b.data.order);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const cats = await getAllCategories();
  return cats.find((c) => c.data.slug === slug || c.data.id === slug) ?? null;
}

export interface TagUsage {
  tag: string;
  count: number;
}

export async function getAllTags(): Promise<TagUsage[]> {
  const posts = await getAllPosts();
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.data.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function getAuthorById(id: string): Promise<Author | null> {
  const all = await getCollection('authors').catch(() => [] as Author[]);
  return all.find((a) => a.data.id === id) ?? null;
}

export async function getAllAuthors(): Promise<Author[]> {
  return await getCollection('authors').catch(() => [] as Author[]);
}

export async function getPostsByAuthor(authorId: string): Promise<Post[]> {
  const all = await getAllPosts();
  return all.filter((p) => p.data.author === authorId);
}

/** Same-category, exclude self, newest first, capped at `limit`. */
export async function getRelatedPosts(post: Post, limit = 3): Promise<Post[]> {
  const sameCategory = await getPostsByCategory(post.data.category);
  return sameCategory.filter((p) => p.id !== post.id).slice(0, limit);
}

/** Chronological neighbors within the visible (published + archived) set. */
export async function getPrevNextPost(post: Post): Promise<{ prev: Post | null; next: Post | null }> {
  const all = await getAllVisiblePosts();
  const idx = all.findIndex((p) => p.id === post.id);
  if (idx === -1) return { prev: null, next: null };
  // all is sorted desc (newest first), so "next" (newer) = idx-1, "prev" (older) = idx+1.
  return {
    next: idx > 0 ? all[idx - 1] : null,
    prev: idx < all.length - 1 ? all[idx + 1] : null,
  };
}

export function computeReadingTime(body: string): string {
  const words = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_\-]+/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / READING_WPM));
  return `${minutes} min read`;
}
