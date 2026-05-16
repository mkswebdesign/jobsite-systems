/**
 * Content-hash cache-busting for static files in public/.
 *
 * Vite hashes its bundled assets automatically; anything served straight from
 * public/ does not. This helper produces `/path?v=<sha1-8>` from a public URL
 * so browsers re-fetch when the file's bytes change.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const PUBLIC_ROOT = join(process.cwd(), 'public');
const MAX_HASH_SIZE = 4 * 1024 * 1024; // 4MB — skip hashing very large files

const cache = new Map<string, string>();

/**
 * Given a public-relative URL like "/assets/foo.png", append "?v=<hash>" where
 * the hash is derived from the file's bytes. Returns the input unchanged if
 * the file is missing, external, or already carries a query string.
 */
export function publicAssetUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.includes('?') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (!url.startsWith('/')) return url;

  const cached = cache.get(url);
  if (cached) return cached;

  const abs = join(PUBLIC_ROOT, url);
  if (!existsSync(abs)) return url;
  if (statSync(abs).size > MAX_HASH_SIZE) return url;

  const h = createHash('sha1').update(readFileSync(abs)).digest('hex').slice(0, 8);
  const out = `${url}?v=${h}`;
  cache.set(url, out);
  return out;
}
