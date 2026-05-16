#!/usr/bin/env node
/**
 * Generate favicon set + OG image for a brand from its brand.json.
 *
 * Usage:
 *   node scripts/generate-brand-assets.mjs <brand-id> [--if-missing]
 *   BRAND=<brand-id> node scripts/generate-brand-assets.mjs [--if-missing]
 *
 * Flags:
 *   --if-missing   No-op if output files already exist AND brand.json asset
 *                  slots are already populated. Safe to chain into build/ship.
 *
 * Reads:
 *   ../arich-source/content/brands/<brand-id>/brand.json
 *
 * Writes:
 *   public/assets/brands/<brand-id>/favicon-32x32.png
 *   public/assets/brands/<brand-id>/apple-touch-icon.png    (180×180)
 *   public/assets/brands/<brand-id>/og-image.jpg            (1200×630)
 *
 * Then updates brand.json's `assets.favicon32`, `assets.appleTouchIcon`, and
 * `assets.ogImage` slots to point at the generated files.
 *
 * Uses `sharp` (already a transitive dep of astro). Output is deterministic:
 * same brand.json → identical bytes.
 *
 * .ico is intentionally skipped — modern browsers accept PNG favicons via
 * `<link rel="icon" type="image/png">`, which Base.astro already emits when
 * `assets.favicon32` is set.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const contentRoot = join(projectRoot, '..', 'arich-source', 'content', 'brands');
const publicRoot = join(projectRoot, 'public', 'assets', 'brands');

const args = process.argv.slice(2);
const ifMissing = args.includes('--if-missing');
const brandId = args.find(a => !a.startsWith('--')) || process.env.BRAND;
if (!brandId) {
  console.error('Usage: node scripts/generate-brand-assets.mjs <brand-id> [--if-missing]');
  console.error('   or: BRAND=<brand-id> node scripts/generate-brand-assets.mjs [--if-missing]');
  process.exit(2);
}

const brandJsonPath = join(contentRoot, brandId, 'brand.json');
if (!existsSync(brandJsonPath)) {
  console.error(`brand.json not found: ${brandJsonPath}`);
  process.exit(2);
}

const brand = JSON.parse(readFileSync(brandJsonPath, 'utf-8'));

if (ifMissing) {
  const outDir = join(publicRoot, brandId);
  const f32 = join(outDir, 'favicon-32x32.png');
  const apple = join(outDir, 'apple-touch-icon.png');
  const og = join(outDir, 'og-image.jpg');
  const slotsSet = brand.assets?.favicon32 && brand.assets?.appleTouchIcon && brand.assets?.ogImage;
  const filesExist = existsSync(f32) && existsSync(apple) && existsSync(og);
  if (slotsSet && filesExist) {
    console.log(`[gen-assets --if-missing] ${brandId}: assets already present, skipping`);
    process.exit(0);
  }
}

const accent = brand.theme?.colors?.accent ?? '#6B00FF';
const accentHover = brand.theme?.colors?.accentHover ?? accent;
const bgPrimary = brand.theme?.colors?.bgPrimary ?? '#0a0a0b';
const bgSecondary = brand.theme?.colors?.bgSecondary ?? '#121214';
const textPrimary = brand.theme?.colors?.textPrimary ?? '#ffffff';
const textSecondary = brand.theme?.colors?.textSecondary ?? '#a1a1aa';
const name = brand.name ?? brandId;
const tagline = brand.tagline ?? '';

/* ---------- helpers ---------- */

function initials(n) {
  return n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || '·';
}

/** XML-escape a string for safe embedding in SVG text nodes. */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

/** Truncate a tagline to fit the OG image comfortably. */
function fitTagline(s, max = 70) {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

const initialsText = initials(name);

/* ---------- SVG templates ---------- */

/** Favicon — used for both 32×32 PNG and 180×180 apple-touch-icon.
 *  viewBox is a 1×1 ratio so the same SVG upscales cleanly. */
function faviconSvg(size = 256) {
  const fontSize = Math.round(size * 0.5);
  const radius = Math.round(size * 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${accent}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="800"
        font-size="${fontSize}" fill="#ffffff" letter-spacing="${Math.round(size * 0.01)}">${esc(initialsText)}</text>
</svg>`;
}

/** OG image — 1200×630 social preview. Dark background with accent accents,
 *  brand name large, tagline smaller, left accent bar. */
function ogSvg() {
  const displayName = esc(name);
  const displayTagline = esc(fitTagline(tagline));
  const nameFontSize = name.length > 22 ? 72 : name.length > 14 ? 92 : 112;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgPrimary}"/>
      <stop offset="100%" stop-color="${bgSecondary}"/>
    </linearGradient>
    <radialGradient id="glow" cx="75%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="80" y="160" width="8" height="310" rx="4" fill="${accent}"/>
  <text x="120" y="280" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="800"
        font-size="${nameFontSize}" fill="${textPrimary}">${displayName}</text>
  ${displayTagline ? `<text x="120" y="360" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="500"
        font-size="36" fill="${textSecondary}">${displayTagline}</text>` : ''}
  <rect x="120" y="${displayTagline ? 430 : 360}" width="120" height="4" rx="2" fill="${accentHover}"/>
</svg>`;
}

/* ---------- generate ---------- */

const outDir = join(publicRoot, brandId);
mkdirSync(outDir, { recursive: true });

const favicon32Path = join(outDir, 'favicon-32x32.png');
const appleTouchPath = join(outDir, 'apple-touch-icon.png');
const ogPath = join(outDir, 'og-image.jpg');

await sharp(Buffer.from(faviconSvg(256)))
  .resize(32, 32)
  .png({ compressionLevel: 9 })
  .toFile(favicon32Path);

await sharp(Buffer.from(faviconSvg(256)))
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toFile(appleTouchPath);

await sharp(Buffer.from(ogSvg()))
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(ogPath);

/* ---------- update brand.json ---------- */

const prefix = `/assets/brands/${brandId}/`;
brand.assets = brand.assets ?? {};
brand.assets.favicon32 = `${prefix}favicon-32x32.png`;
brand.assets.appleTouchIcon = `${prefix}apple-touch-icon.png`;
brand.assets.ogImage = `${prefix}og-image.jpg`;

writeFileSync(brandJsonPath, JSON.stringify(brand, null, 2) + '\n');

console.log(`generated brand assets for ${brandId}:`);
console.log(`  ${favicon32Path}`);
console.log(`  ${appleTouchPath}`);
console.log(`  ${ogPath}`);
console.log(`updated brand.json asset slots.`);
