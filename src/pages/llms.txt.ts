import type { APIRoute } from 'astro';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { brand, BRAND_ID } from '../builder/lib/brand';

const __dirname = dirname(fileURLToPath(import.meta.url));
const _llmsArichBase = existsSync(join(__dirname, '..', '..', 'arich-source'))
  ? join(__dirname, '..', '..', 'arich-source')
  : join(__dirname, '..', '..', '..', 'arich-source');
const BRAND_ROOT = join(_llmsArichBase, 'content', 'brands', BRAND_ID);

export const GET: APIRoute = () => {
  const customPath = join(BRAND_ROOT, 'llms.txt');
  let body: string;

  if (existsSync(customPath)) {
    body = readFileSync(customPath, 'utf-8');
  } else {
    const host = new URL(brand.url).host;
    body = `# ${brand.name} — ${host}

> ${brand.description}

## Contact

- Email: ${brand.contact.email}
- Website: ${brand.url}
- Owner: ${brand.owner.name}
`;
  }

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
