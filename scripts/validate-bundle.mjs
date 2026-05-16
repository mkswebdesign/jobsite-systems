#!/usr/bin/env node
/**
 * Validate a page export bundle.
 *
 * Read-only structural check that the bundle's `deps` covers every cross-ref
 * in `page.sections[]`, that the asset shape is valid, and that the recorded
 * `checksum` matches a re-computed canonical-JSON sha256.
 *
 * Usage:
 *   node scripts/validate-bundle.mjs <bundle.json>
 *   node scripts/validate-bundle.mjs -    # read from stdin
 *
 * Exits 0 on clean. Exits 1 with a labeled list of failures otherwise.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { canonicalize } from './_lib.mjs';

const arg = process.argv[2];
if (!arg) {
  console.error('validate-bundle: usage: node scripts/validate-bundle.mjs <path-to-bundle.json | ->');
  process.exit(1);
}

let raw;
if (arg === '-') {
  try { raw = readFileSync(0, 'utf-8'); }
  catch (err) { console.error('validate-bundle: failed to read stdin: ' + err.message); process.exit(1); }
} else {
  if (!existsSync(arg)) { console.error('validate-bundle: file not found: ' + arg); process.exit(1); }
  raw = readFileSync(arg, 'utf-8');
}

let bundle;
try { bundle = JSON.parse(raw); }
catch (err) { console.error('validate-bundle: invalid JSON: ' + err.message); process.exit(1); }

const errors = [];

if (bundle.bundleVersion !== 1) errors.push('bundleVersion must be 1 (got ' + JSON.stringify(bundle.bundleVersion) + ')');
if (!bundle.source || typeof bundle.source !== 'object') errors.push('source object missing');
else {
  if (!bundle.source.brand || typeof bundle.source.brand !== 'string') errors.push('source.brand must be a string');
  if (!bundle.source.slug || typeof bundle.source.slug !== 'string') errors.push('source.slug must be a string');
}
if (!bundle.page || typeof bundle.page !== 'object') errors.push('page is required');
if (!bundle.deps || typeof bundle.deps !== 'object') errors.push('deps is required');
if (!Array.isArray(bundle.assets)) errors.push('assets must be an array');
if (!bundle.compat || typeof bundle.compat !== 'object') errors.push('compat is required');
if (typeof bundle.checksum !== 'string') errors.push('checksum must be a string');

if (errors.length === 0) {
  const sections = Array.isArray(bundle.page.sections) ? bundle.page.sections : [];
  const services = bundle.deps.services || {};
  const work = bundle.deps.work || {};
  const testimonials = Array.isArray(bundle.deps.testimonials) ? bundle.deps.testimonials : [];
  const testimonialIdSet = new Set(testimonials.map((t) => t && t.id).filter(Boolean));
  const faqs = bundle.deps.faqs || { groups: [], items: [] };
  const faqGroupIds = new Set((faqs.groups || []).map((g) => g && g.id).filter(Boolean));
  const faqItemIds = new Set();
  for (const g of (faqs.groups || [])) for (const f of (g.faqs || g.items || [])) if (f && f.id) faqItemIds.add(f.id);
  for (const f of (faqs.items || [])) if (f && f.id) faqItemIds.add(f.id);

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (!s || typeof s !== 'object') continue;
    for (const slug of (s.serviceSlugs || [])) if (!services[slug]) errors.push(`page.sections[${i}].serviceSlugs: '${slug}' missing from deps.services`);
    for (const slug of (s.workSlugs || []))    if (!work[slug])     errors.push(`page.sections[${i}].workSlugs: '${slug}' missing from deps.work`);
    for (const id of (s.testimonialIds || [])) if (!testimonialIdSet.has(id)) errors.push(`page.sections[${i}].testimonialIds: '${id}' missing from deps.testimonials`);
    for (const id of (s.faqIds || []))         if (!faqItemIds.has(id))      errors.push(`page.sections[${i}].faqIds: '${id}' missing from deps.faqs`);
    for (const id of (s.groupIds || []))       if (!faqGroupIds.has(id))     errors.push(`page.sections[${i}].groupIds: '${id}' missing from deps.faqs.groups`);
  }

  const recomputed = createHash('sha256').update(canonicalize({ page: bundle.page, deps: bundle.deps })).digest('hex');
  if (recomputed !== bundle.checksum) {
    errors.push(`checksum mismatch: stored=${String(bundle.checksum).slice(0,16)}… recomputed=${recomputed.slice(0,16)}…`);
  }

  for (let i = 0; i < bundle.assets.length; i++) {
    const a = bundle.assets[i];
    if (!a || typeof a !== 'object') { errors.push(`assets[${i}] must be an object`); continue; }
    if (typeof a.url !== 'string') errors.push(`assets[${i}].url must be a string`);
    if (!['external', 'per-brand-source', 'build-asset', 'unknown'].includes(a.kind)) {
      errors.push(`assets[${i}].kind invalid (${JSON.stringify(a.kind)})`);
    }
  }
}

if (errors.length > 0) {
  console.error(`validate-bundle: ${errors.length} issue(s)`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}

const sectionCount = Array.isArray(bundle.page.sections) ? bundle.page.sections.length : 0;
const sourceLabel = bundle.source.brand + '/' + bundle.source.slug;
console.log(`validate-bundle: ok — ${sourceLabel} (sections=${sectionCount}, services=${Object.keys(bundle.deps.services||{}).length}, work=${Object.keys(bundle.deps.work||{}).length}, testimonials=${(bundle.deps.testimonials||[]).length}, assets=${bundle.assets.length})`);
