/**
 * Admin gallery endpoint.
 *
 * Emits the brand's image library as a JSON array, fetched by the editor
 * (and only the editor) when an admin activates edit mode via ?edit=1.
 * Replaces the previous AED_GALLERY inline-into-every-page approach,
 * which shipped 60+ image URLs to public HTML and was flagged by the
 * 2026-05-04 audit as bloat without public benefit.
 *
 * The URLs themselves are public CDN paths (Pexels / Unsplash) — no
 * security gate is needed; the goal is keeping public page HTML lean.
 *
 * Lives under /admin/ rather than /api/ so robots.txt's existing
 * /admin/ disallow rule covers it without extra config; sitemap.xml.ts
 * already excludes /admin/* by convention.
 */
import type { APIRoute } from 'astro';
import { loadBrandGallery } from '../../builder/lib/brand';

export const prerender = true;

export const GET: APIRoute = () => {
  const gallery = loadBrandGallery() ?? [];
  return new Response(JSON.stringify(gallery), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
};
