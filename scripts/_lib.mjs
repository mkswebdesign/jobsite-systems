/**
 * Shared script helpers — small, specific, no external deps.
 *
 * Underscore prefix matches the convention from `_ship-lock.mjs` (internal,
 * not exposed via `npm run ...`). Only obvious duplicated helpers belong
 * here. Resist the urge to make this a generic utility dump.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Deterministic JSON serialization for hashing.
 *
 * Object keys are sorted; arrays preserve order. The output is a stable string
 * that survives re-encoding, so two callers can compute the same sha256 over
 * the same logical value regardless of how the object was constructed.
 *
 * Used by `export-page.mjs` (bundle.checksum) and `validate-bundle.mjs`
 * (re-compute and compare). Behavior must remain byte-equivalent across both.
 */
export function canonicalize(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

/**
 * Parse the editor IIFE's VERSION constant from the head of `edit.js`.
 *
 * Returns the string version (e.g. `'0.31.6'`) or `null` if the file is
 * missing or the constant can't be parsed. Reads only the first 4096 bytes,
 * since VERSION lives at the top of the file.
 *
 * Used by `deploy.mjs` (manifest entry) and `export-page.mjs` (bundle's
 * `exportedBy` field). Behavior must remain identical to the inline copies
 * those scripts had before the extraction.
 */
export function parseEditorVersion(projectRoot) {
  const editorJsPath = join(projectRoot, 'public', 'assets', 'builder', 'editor', 'edit.js');
  if (!existsSync(editorJsPath)) return null;
  const head = readFileSync(editorJsPath, 'utf-8').slice(0, 4096);
  const m = head.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}
