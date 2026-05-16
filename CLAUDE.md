# jobsite.systems — agent orientation

Astro SSG **template** that renders a brand from `arich-source/content/brands/jobsite-systems/` into static `dist/`. Same template serves many brands; the `BRAND` env var picks which one.

## Two-repo split (important — not an Astro default)

- **`arich-astro/`** (this repo) — templates, components, CSS, build scripts. No brand data.
- **`arich-source/content/brands/jobsite-systems/`** — per-brand JSON data. Referenced by `src/lib/brand.ts` and `src/content/config.ts` via relative path.

If you're looking for copy/colors/services/work data, **it's not in `src/content/` — only the schema is.** Actual records live in `arich-source/`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server (uses BRAND=jobsite-systems) |
| `BRAND=jobsite-systems npm run dev` | Dev server for this brand explicitly |
| `npm run build` | `astro check` + build + prune-dist |
| `npm run build:fast` | Build + prune-dist (skips type check) |

## Deploying / Shipping

This site auto-deploys via Git -> GitHub -> xCloud. After any code change:

**When I say any of these, commit and push immediately:**
- "ship it"
- "deploy"
- "push it"
- "go live"
- "send it"
- "publish"
- "done, deploy"

**Steps:**
```bash
git add -A
git commit -m "<brief description>"
git push origin main
```

Site rebuilds automatically in ~60 seconds on the xCloud demo URL.
No SFTP, no Mountain Duck, no manual build needed.

**After pushing, confirm:** "Pushed to GitHub. Site will be live in about a minute."

## Brand: jobsite-systems

- **Domain:** jobsite.systems
- **Business:** Jobsite Systems — simple, secure websites for jobsite/construction companies
- **Brand ID for BRAND env var:** `jobsite-systems`

## Where to make common changes

- **Copy / headlines / CTAs / services / work** → `arich-source/content/brands/jobsite-systems/` JSON files
- **Styles** → `src/builder/styles/brands/jobsite-systems.css`
- **Global styles** → `src/builder/styles/`
