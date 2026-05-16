/**
 * Variant cap constants — single source of truth for letter-coded section variants.
 *
 * Letter variants (`A`, `B`, …) cap at `MAX_VARIANT_LETTER`. Anything above the cap
 * is silently dropped by the Base.astro sanitizer at runtime. Bumping the cap is a
 * one-place change here; `audit-variants.mjs` enforces that no component declares a
 * letter beyond it.
 *
 * Kebab-coded variants (`grid`, `compact`, lowercase letters, …) are unaffected by
 * the cap and validated against `VARIANT_KEBAB_RE_SOURCE` instead.
 */

/** Highest allowed uppercase variant letter. Currently 'K' — Hero's `Pulse`,
 *  FinalCta's `Split`, DesignBreak's `Walk-Through` (H), DesignBreak's
 *  `Field-Notes` (I), DesignBreak's `Direct` (J), DesignBreak's
 *  `Quiet-Promise` (K) — last four are landscape-systems only. */
export const MAX_VARIANT_LETTER = 'K';

/** Regex source for letter-coded variants. Embedded into `Base.astro`'s pre-paint sanitizer. */
export const VARIANT_LETTER_RE_SOURCE = `^[A-${MAX_VARIANT_LETTER}]$`;

/** Regex source for kebab-coded variants (and lowercase single letters). */
export const VARIANT_KEBAB_RE_SOURCE = '^[a-z0-9][a-z0-9-]{0,31}$';
