# gomks builder / editor — Rules for AI Agents

Practical rules for editing `edit.js` and adjacent files without silently breaking the editor's contract with the rest of the system. The companion [README.md](./README.md) covers install + the copy-patch payload format; this file covers what's load-bearing when you change `edit.js` itself.

## 1. Source of truth

- **Editor IIFE:** [edit.js](./edit.js) — single-file, zero-dependency, injects its own CSS + DOM. Bump `VERSION` at the top before shipping.
- **Bootstrap:** [bootstrap.js](./bootstrap.js) — the loader (allowlist, `?edit=force`, `Ctrl+Shift+E`). Untouched by most editor work.
- **Storage namespace:** every key starts with `aed:`. Reserve prefixes; never reuse them across unrelated features.
- **Cross-brand:** the editor folder syncs across all brands by build (per `editor_tool_location` policy). All visual / copy / per-brand differences belong in `src/builder/styles/brands/<id>.css` and the brand JSON, **not** in `edit.js`.

## 2. Storage key conventions

- **`aed:<flat-bucket>`** — single-key storage holding one staged-work blob (e.g. `aed:image-library`, `aed:addons-pending`, `aed:editor-feedback`). Always paired with a `save<Bucket>(value)` helper; reads via the same shape.
- **`aed:<prefix>:<page>:<type>:<index>`** — section-style storage for per-section overrides (e.g. `aed:sec-theme:/about/:hero:0`). Cleared via the `sectionStoragePrefixes` sweep in `clearSession()`.
- **`aed:<thing>-variant`** — letter or kebab variant set by the variant picker. Sanitized at restore time by [src/builder/layouts/Base.astro](../../../../src/builder/layouts/Base.astro) using the constants in [src/builder/lib/variants.ts](../../../../src/builder/lib/variants.ts).
- **`aed:active`** is per-origin: each brand site has its own enabled/disabled state. Never propagate `aed:active` across origins.

When in doubt, grep `localStorage` in `edit.js` and follow the conventions of an existing key in the same family.

## 3. Adding a new flat pending-bucket (`aed:<bucket>`)

A new staged-work bucket needs **five coordinated wires**. Skip any one and the bug looks different to the user but the cause is the same — the bucket is invisible or sticky.

1. **Save helper + load helper.** Mirror an existing pair (e.g. grep `saveImageLibrary` or `saveAddonsPending`). Keep the saved shape JSON-stable.
2. **`clearSession()`** — add an explicit `save<Bucket>([])` (or `{}`) call alongside `saveAddonsPending`, `saveAddonFeedback`, `saveEditorFeedback`, `saveImageFeedback`, `clearImageSelections`, `saveImageLibrary`. Flat buckets are NOT reached by the `sectionStoragePrefixes` sweep — they need an explicit clear.
3. **`render()` grand total** — load the bucket near the top of `render()`, compute its count, add it to `grandTotal`. Without this, the panel count badge doesn't bump and the **Copy Patch** button stays disabled when this bucket is the only thing pending.
4. **Panel group** — render an `aed-group-head` row + per-item rows so the user can see what's queued. Mirror the pattern of an existing flat-bucket group (Image library, Image selections, Editor feedback, Addon feedback). Include a group-clear button that calls the same save-empty function `clearSession()` does.
5. **README + PAYLOAD_INSTRUCTIONS** — add the key to the localStorage table in [README.md](./README.md) and a one-line entry to `PAYLOAD_INSTRUCTIONS` describing what the agent should do with the new payload key on the receiving end.

**Reference:** the pattern was learned across `aed:image-library` (v0.31.2 → v0.31.3 missed step 2; users reported "Clear Session doesn't clear the image library") and `aed:editor-feedback`.

## 4. Adding a new builder-injected section type (DesignBreak / ContentSection / StatRibbon pattern)

When the new type is a builder-injected primitive (not just a regular section the user composes via `pages/*.json`), `edit.js` needs ~14 coordinated sites and `src/pages/internal-fork/options.astro` needs 2 more. Start with a working type's prefix (`csInjections`, `srInjections`) and grep — every hit is a place that needs the new prefix mirrored.

For prefix `xy`:

1. **Storage** — `XY_INJECT_PREFIX`, `XY_REMOVE_PREFIX`; `loadXyInjections` / `saveXyInjections` / `addXyInjection` / `updateXyInjection` / `removeXyInjection` / `collectAllXyInjections`.
2. **DOM helpers** — `authoredXySectionEls()`, `readXySectionHeading()`, `readXySectionEyebrow()`.
3. **Rendering** — `buildXyMarker()`, `renderXyInjections()`, `refreshXySectionChips()`.
4. **Boot lifecycle** — `pruneAppliedXyEntries()` + add to boot prune call + boot render call.
5. **Form integration** — add a tab; add a `SECTION_KIND_COPY` entry; kind-detection in `openDbForm`; kind-routing in `submitDbForm`; accept the kind in `readSectionFormKind` + `saveSectionFormKind`.
6. **`clearSession()` sweep** — add prefixes to `sectionStoragePrefixes`. Also add to **both** branches of `clearPageStorage` (current page AND cross-page — easy to miss the second branch).
7. **`SPECIALIZED_REMOVAL_TYPES`** — add the kebab-case type id.
8. **`copyPatch` payload writer** — collect counts, include in `hasAny`, emit `xyInjections`/`xyRemovals` payload keys with `afterSection` enrichment, add to suffix message.
9. **Per-page panel `render()` pipeline** — the most-forgotten step. Add `xyInjByPage` / `xyRmByPage` / `xyInjTotal` / `xyRmTotal` declarations; include both in `grandTotal`; add two `Object.entries(xy*ByPage).forEach` loops that attach `xyInjections`/`xyRemovals` arrays to `renderGroups`; include them in the per-group `countNum` math; add two row renderer blocks that mirror the CS row blocks exactly (spark/trash icons, slot chip, restore-from-graveyard chip, copy-as-JSON button with `kind: 'xyInjection'`/`kind: 'xyRemoval'`, click-to-edit on injection, scroll-to-section flash on removal).
10. **`DEBUG_REGIONS`** — add `INJ-MARKER-XY`, `PENDING-RM-XY`, `SEC-CHIP-XY`.
11. **Marker CSS tint + section chip CSS tint** — pick a color distinct from existing types.
12. **`renderDbInjections` wipe selector** — already excludes existing markers via `:not(.aed-cs-marker):not(.aed-sr-marker)`; extend with `:not(.aed-xy-marker)`.
13. **Marker stacking loop in `renderCsInjections`** — its `while (cursor.classList.contains(...))` chain already checks DB/CS/SR; extend to XY so stacked markers don't collide.
14. **`PAYLOAD_INSTRUCTIONS`** — add full agent docs for `xyInjections` + `xyRemovals`. Be explicit about restoration / prompt-as-JSON / lifecycle log / flat-format-page handling — don't write "same rules as designBreak."

**`src/pages/internal-fork/options.astro`:**

1. **`doRestore`** — type-routing branch for `xy` → `aed:xy-inject:` storage with verbatim props.
2. **`renderGrvPreview` registry** — add `else if (type === 'xy') renderXyPreview(wrap, section);` and the renderer function.

**Brand CSS** ([src/builder/styles/brands/](../../../../src/builder/styles/brands/)):

- Base styles for `.xy-section__*` selectors.
- Variant overrides under `[data-<name>-variant='X']`.
- Theme overrides for `data-sec-theme` (vibrant / dark / light / primary).
- Append the section's text element selectors to the shared `aedSectionElEnter` / `aedDesignBreakEnter` entrance animation block. See [../../../../src/builder/styles/brands/AGENTS.md](../../../../src/builder/styles/brands/AGENTS.md) for which keyframe to pick.

**Component + schema:** add a Zod member to [src/content/config.ts](../../../../src/content/config.ts) `pageSection` union; add `Xy.astro` under [src/builder/components/sections/](../../../../src/builder/components/sections/) with the three `data-section-*` attributes; add the type to `KNOWN_SECTION_TYPES` in `scripts/validate-brand.mjs`; add a render case in any page that composes via `sections[]`. See [src/builder/components/sections/AGENTS.md](../../../../src/builder/components/sections/AGENTS.md) for the section-side checklist.

The reason the `render()` pipeline is the most-forgotten step is that it's a long function with no obvious "register a new type here" extension point. Always grep `csInjByPage` and `csInjections` in `render()` context to find every site.

## 5. Editor chrome that attaches to a section — chip / marker z-index recipe

Any new editor-attached label or affordance that lives **inside** a section (variant chip `.aed-sec-chip`, removal chip `.aed-db-section-chip`) or **between** sections (gap rail `.aed-db-gap`, pending marker `.aed-db-marker`) gets the same defensive treatment so nothing on the page can cover or steal clicks from it:

- `z-index: 2147483640` (one slot below the editor panel's `2147483646`).
- `pointer-events: auto !important`. Without `!important`, an ancestor with `pointer-events: none` (we use this on `.aed-sec-root`) silently neutralizes clicks.

In-section chips MUST also rely on the global rule already shipped in [edit.js:2647](./edit.js):

```css
html.aed-editor-loaded [data-section-type] { isolation: isolate }
```

…plus a JS check that sets `section.style.position = 'relative'` if computed position is `static`. Together these:

1. Give the section its own stacking context so the giant z-index is scoped locally — no page-wide z-index war.
2. Make the section a containing block so `top` / `right` / `left` / `bottom` resolve against section bounds.
3. Defeat any internal layer (parallax bg, hero canvas, overlay scrim) that tried to win z-index inside the section.

**Don't use polite values like 5/6/7** — they will lose to some hero variant eventually. Discovered while migrating the variant chip from a floating overlay to a section-child layout.

## 6. Versioning + deploy

- Bump `VERSION` at the top of [edit.js](./edit.js) on every shipped change. The number shows in the panel header and quick-reference drawer.
- The editor is brand-portable: the source file lives at [public/assets/builder/editor/edit.js](./edit.js) in `arich-astro` and gets shipped to every brand mount via the build pipeline.
- Sync boundary: `edit.js`, `bootstrap.js`, and this folder's contents are universal across brands. Anything brand-specific (palette, copy, motion ranges, per-brand variant CSS) belongs in `src/builder/styles/brands/<id>.css`. See [../../../../src/builder/styles/brands/AGENTS.md](../../../../src/builder/styles/brands/AGENTS.md).

## 7. See also

- [README.md](./README.md) — installation, activation paths, copy-patch payload schema (the contract the receiving agent processes).
- [src/builder/components/sections/AGENTS.md](../../../../src/builder/components/sections/AGENTS.md) — section-component side: schema / wiring / variants checklist.
- [src/builder/styles/brands/AGENTS.md](../../../../src/builder/styles/brands/AGENTS.md) — per-brand CSS rules; section-entrance motion scale; reduced-motion fallback.
