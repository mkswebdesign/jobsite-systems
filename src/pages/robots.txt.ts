import type { APIRoute } from 'astro';
import { brand } from '../builder/lib/brand';

export const GET: APIRoute = () => {
  const host = new URL(brand.url).host;
  const body = `# robots.txt for ${host}
# Allow all search engines and AI crawlers to index the entire site

User-agent: *
Allow: /
Disallow: /fonts/
Disallow: /images/site/
Disallow: /demo/
Disallow: /internal-fork/
Disallow: /onboard/
Disallow: /support/

Sitemap: ${brand.url.replace(/\/$/, '')}/sitemap.xml

# Explicitly allow AI crawlers
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Bytespider
Allow: /

User-agent: cohere-ai
Allow: /
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
