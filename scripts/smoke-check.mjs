#!/usr/bin/env node
/**
 * Advisory post-deploy smoke check.
 *
 * Hits the brand's live URL and verifies a small set of integrity probes
 * (homepage 200, brand identity in the markup, structured-data block, etc.).
 * Loud failure output, but exit code is whatever the caller wants — ship.mjs
 * runs this in advisory mode so a smoke-check failure does NOT fail the ship.
 *
 * Standalone:
 *   BRAND=gomks npm run smoke
 *
 * Inside ship pipeline:
 *   ship.mjs catches non-zero exits and continues — the warning is printed
 *   regardless and that's the value: a loud signal next to the green ship log.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const brand = process.env.BRAND;
if (!brand) {
  console.error('smoke-check: BRAND env var is required (e.g. BRAND=gomks npm run smoke)');
  process.exit(1);
}

const brandJsonPath = resolve(projectRoot, '..', 'arich-source', 'content', 'brands', brand, 'brand.json');
if (!existsSync(brandJsonPath)) {
  console.error(`smoke-check: brand.json not found at ${brandJsonPath}`);
  process.exit(1);
}

let brandJson;
try {
  brandJson = JSON.parse(readFileSync(brandJsonPath, 'utf-8'));
} catch (err) {
  console.error(`smoke-check: failed to parse brand.json — ${err.message}`);
  process.exit(1);
}

const url = brandJson.url;
const name = brandJson.name;
if (!url || typeof url !== 'string') {
  console.error(`smoke-check: brand.json has no .url string`);
  process.exit(1);
}
if (!name || typeof name !== 'string') {
  console.error(`smoke-check: brand.json has no .name string`);
  process.exit(1);
}

console.log(`smoke-check: brand=${brand}  url=${url}`);

const TIMEOUT_MS = 10_000;

let html = '';
let httpStatus = 0;
let netError = null;
const ac = new AbortController();
const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
try {
  const res = await fetch(url + '/', { signal: ac.signal, redirect: 'follow' });
  httpStatus = res.status;
  html = await res.text();
} catch (err) {
  netError = err;
} finally {
  clearTimeout(timer);
}

const checks = [];
if (netError) {
  checks.push(['network reachable', false, netError.message]);
} else {
  checks.push(['homepage 200', httpStatus === 200, `got ${httpStatus}`]);
  checks.push(['has <title>', /<title>[^<]+<\/title>/.test(html)]);
  checks.push([`HTML mentions brand name "${name}"`, html.includes(name)]);
  checks.push([`canonical points to ${url}`, html.includes(`<link rel="canonical" href="${url}`)]);
  /* Accept any hero-family section type — `hero` (default) or any
   * kebab variant ending in `-hero` (e.g. `newsroom-hero` for blog
   * brands). The shape of the section can vary across brands; what
   * we want to assert is that *some* hero rendered above the fold. */
  checks.push(['hero section present', /data-section-type="(?:[a-z][a-z0-9]*-)?hero"/.test(html)]);
  checks.push(['JSON-LD block present', /<script type="application\/ld\+json"/.test(html)]);
  checks.push(['main.js loaded', /\/assets\/builder\/main\.js\?v=/.test(html)]);
  checks.push(['no error-frame markers', !/__astro_dev_overlay|TypeError:|ReferenceError:|Astro\.glob/.test(html)]);
}

let bad = 0;
for (const [label, ok, detail] of checks) {
  console.log((ok ? '  OK   ' : '  FAIL ') + label + (detail ? ` (${detail})` : ''));
  if (!ok) bad++;
}

if (bad) {
  console.error(`smoke-check: ${bad} of ${checks.length} check(s) failed for brand=${brand} url=${url}`);
  process.exit(1);
}
console.log(`smoke-check: ok — ${checks.length} checks passed for brand=${brand}`);
