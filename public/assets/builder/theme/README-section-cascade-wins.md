# `section-cascade-wins.css`

## Purpose

Shipped HTML loads styles in this order:

1. `theme.css` — root tokens, `data-theme` modes  
2. `section-overrides.css` — per-section `data-sec-theme` tokens (often wrapped in `:where(html…)` for **low** specificity)  
3. Addons and inline chunks  
4. **`/assets/_astro/privacy.*.css`** — page + section **variant** rules (high specificity, **loads late**)  
5. **`section-cascade-wins.css`** (this file) — **must stay immediately after** the privacy bundle  
6. Optional: `home-session-notes.css` and other page-local patches  

When a primary section (`[data-sec-theme="primary"]`) forces `--accent: #fff` on its content wrapper, any later rule of the form **“white fill + `color: var(--accent)`”** becomes **white-on-white**. The cascade-wins sheet repeats the fix with **`html[data-theme="vibrant"] …` selectors (no `:where`)** so specificity beats the bundle.

## When to update

- New CTA / service / work variant CSS uses `var(--accent)` for text on a **light** button inside a **primary** section in **vibrant** mode.  
- Visual QA on contact, pricing, work detail, or service templates with **Primary** section theme + **variant C** (or similar) on the action row.

## How to verify

1. Set site theme to **Vibrant** (`<html data-theme="vibrant">`).  
2. Set the target section’s **Theme override** to **Primary** (or rely on baked `primary`).  
3. Try section / layout variants that style `.final-cta-actions`, `.service-cta-actions`, or `.work-cta-actions`.  
4. Confirm `.btn-primary` label contrast (WCAG-ish: dark violet on `#fff`).

## Upstream fix (preferred long-term)

In Astro / component source, prefer **fixed ink** for “inverse” buttons (e.g. `color: #320858` or `color-mix`) instead of `color: var(--accent)` when the fill is `#fff`, so the page bundle does not depend on this patch file.

## Bump cache

After editing `section-cascade-wins.css`, bump the `?v=` query on its `<link>` in every HTML layout (or your build step that emits layouts). Current stamp: `?v=20260423-2` (bump in every shipped `*.html` when this file changes).
