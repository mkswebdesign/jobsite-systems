/**
 * Shared lockfile helper for ship.mjs and run-build.mjs.
 *
 * The lock at <projectRoot>/.ship.lock holds across the build → deploy pipeline so two
 * brand pipelines can't race through astro build + prune-dist and ship contaminated dist/.
 * Stale locks (PID not alive) are detected and taken over with a warning.
 */
import { readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LOCK_PATH = join(projectRoot, '.ship.lock');

let acquired = false;

export function acquire(brand) {
  try {
    writeFileSync(LOCK_PATH, payload(brand), { flag: 'wx' });
    acquired = true;
    return;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
  let existing = null;
  let mtimeMs = 0;
  try {
    existing = JSON.parse(readFileSync(LOCK_PATH, 'utf-8'));
    mtimeMs = statSync(LOCK_PATH).mtimeMs;
  } catch { /* unparseable — treat as stale */ }
  const pid = existing && typeof existing.pid === 'number' ? existing.pid : null;
  let alive = false;
  if (pid !== null) {
    try { process.kill(pid, 0); alive = true; } catch { alive = false; }
  }
  if (alive) {
    console.error(`ship-lock: another ship or build is already running (lock at ${LOCK_PATH})`);
    if (existing) {
      console.error(`  pid=${existing.pid} brand=${existing.brand} started=${existing.started}`);
    }
    console.error('  if this is wrong, remove the lock file manually and retry.');
    process.exit(1);
  }
  const ageS = mtimeMs ? Math.round((Date.now() - mtimeMs) / 1000) : '?';
  console.error(`ship-lock: stale lock detected (pid=${pid ?? '?'} age=${ageS}s) — taking over`);
  try { rmSync(LOCK_PATH); } catch { /* race */ }
  writeFileSync(LOCK_PATH, payload(brand), { flag: 'wx' });
  acquired = true;
}

export function release() {
  if (!acquired) return;
  acquired = false;
  try { rmSync(LOCK_PATH); } catch { /* already gone */ }
}

export function installSignalHandlers() {
  process.on('exit', release);
  process.on('SIGINT', () => { release(); process.exit(130); });
  process.on('SIGTERM', () => { release(); process.exit(143); });
  process.on('uncaughtException', (err) => { release(); console.error(err); process.exit(1); });
}

function payload(brand) {
  return JSON.stringify({ pid: process.pid, brand, started: new Date().toISOString() }, null, 2) + '\n';
}
