#!/usr/bin/env node
/*
 * Smoke test for the contact-proxy worker.
 *
 * Posts a synthetic submission to the deployed worker for every brand and
 * asserts the worker returns HTTP 200 with `{ ok: true }`. That single check
 * exercises the full inbound path: CORS, brand resolution, required-field
 * validation, fallback brand handling, and (if --real) Emailit acceptance.
 *
 * Brand list is loaded from ../brands.json — same source the worker uses, so
 * this list never drifts. Adding a brand: edit brands.json, redeploy worker,
 * smoke picks it up automatically.
 *
 * What it CATCHES:
 *   - Worker code regressions (deploy broke something)
 *   - Brand misconfig (missing fields, malformed `from`)
 *   - Required-field validation drift
 *   - Fallback brand resolution
 *   - With --real: Emailit acceptance (Domain not verified, DKIM rotation, etc.)
 *
 * What it DOES NOT catch (Tier 2 territory):
 *   - Cloudflare Email Routing rules dropping the forward (would need CF API)
 *   - Final inbox spam-bucketing (would need Gmail API)
 *
 * Default mode is DRY-RUN — sends `_dry_run=1` so the worker validates
 * routing but does NOT call Emailit. Catches ~80% of issues without burning
 * email quota or generating inbox noise. Use --real for periodic full-path
 * checks (weekly is fine).
 *
 * Usage:
 *   node scripts/smoke.mjs                          # dry-run, all brands (default)
 *   node scripts/smoke.mjs --real                   # full real-send mode (uses Emailit quota)
 *   node scripts/smoke.mjs --brand=gomks            # one brand
 *   node scripts/smoke.mjs --concurrency=20         # parallelism (default: 10)
 *   ENDPOINT=https://... node scripts/smoke.mjs     # override worker URL
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENDPOINT = process.env.ENDPOINT || 'https://contact-proxy.anthony-abc.workers.dev';

const args = process.argv.slice(2);
const REAL_MODE = args.includes('--real');
const brandFilter = args.find((a) => a.startsWith('--brand='))?.split('=')[1];
const CONCURRENCY = parseInt(args.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ?? '10', 10);

const brandsConfig = JSON.parse(readFileSync(join(HERE, '..', 'brands.json'), 'utf8'));
const ALL_BRANDS = Object.entries(brandsConfig.brands).map(([id, cfg]) => ({
  id,
  // Pull the human-readable name out of the From-header display name; falls
  // back to capitalized id if the From doesn't follow "<Name> <addr>" form.
  label: (cfg.from.match(/^([^<]+?)\s*</) || [, id])[1].trim(),
}));

const TEST_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const NOW_ISO = new Date().toISOString();

async function smoke(brand) {
  const form = new FormData();
  form.set('brand', brand.id);
  form.set('name', 'Smoke Test');
  form.set('email', 'noreply@gomks.com');
  form.set('message', `Smoke test from contact-proxy/scripts/smoke.mjs\nTest ID: ${TEST_ID}\nWhen: ${NOW_ISO}\nMode: ${REAL_MODE ? 'real' : 'dry-run'}`);
  form.set('terms', 'smoke-test');
  form.set('_subject', `[SMOKE${REAL_MODE ? '' : '-DRY'}] ${brand.label} @ ${NOW_ISO} (${TEST_ID})`);
  form.set('form_source', 'smoke-test');
  if (!REAL_MODE) form.set('_dry_run', '1');

  const t0 = Date.now();
  let res;
  let body = {};
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      body: form,
      headers: { Accept: 'application/json' },
    });
    body = await res.json().catch(() => ({}));
  } catch (e) {
    return { brand: brand.id, ok: false, status: 'NETWORK', error: e.message, ms: Date.now() - t0 };
  }
  return {
    brand: brand.id,
    ok: res.ok && body.ok === true,
    status: res.status,
    error: body.error || (res.ok && !body.ok ? 'response missing ok:true' : null),
    dryRun: !!body.dryRun,
    resolved: body.resolved || null,
    ms: Date.now() - t0,
  };
}

async function runConcurrent(brands, concurrency) {
  const results = new Array(brands.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, brands.length) }, async () => {
    while (cursor < brands.length) {
      const idx = cursor++;
      results[idx] = await smoke(brands[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const targets = brandFilter
    ? ALL_BRANDS.filter((b) => b.id === brandFilter)
    : ALL_BRANDS;
  if (targets.length === 0) {
    console.error(`No brand matches --brand=${brandFilter}. Known: ${ALL_BRANDS.map((b) => b.id).join(', ')}`);
    process.exit(2);
  }

  console.log(`Smoke test — contact-proxy worker`);
  console.log(`endpoint:    ${ENDPOINT}`);
  console.log(`mode:        ${REAL_MODE ? 'REAL (Emailit will send)' : 'dry-run (no Emailit call)'}`);
  console.log(`brands:      ${targets.length} (${targets.map((b) => b.id).join(', ')})`);
  console.log(`concurrency: ${CONCURRENCY}`);
  console.log(`test-id:     ${TEST_ID}`);
  console.log(`time:        ${NOW_ISO}`);
  console.log(``);

  const tWall = Date.now();
  const results = await runConcurrent(targets, CONCURRENCY);
  const wallMs = Date.now() - tWall;

  for (const r of results) {
    const tag = r.ok ? 'OK  ' : 'FAIL';
    const detail = r.ok
      ? (r.dryRun ? `dry-run → ${r.resolved?.to?.join(',') ?? '?'}` : 'sent')
      : (r.error || '(no error)');
    console.log(`  ${r.brand.padEnd(20)} ${tag}  ${String(r.status).padEnd(7)} ${detail}  (${r.ms}ms)`);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(``);
  console.log(`${passed} passed, ${failed} failed — wall time ${wallMs}ms`);
  if (failed > 0) {
    console.log(``);
    console.log(`Failures:`);
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  ${r.brand}: status=${r.status}  error=${r.error}`);
    }
  }
  process.exit(failed === 0 ? 0 : 1);
}

main();
