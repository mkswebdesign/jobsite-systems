# gomks builder — portable in-page feedback/edit tool

A drop-in folder. Copy `public/editor/` to another site's `public/` and wire up
one `<script>` tag. That's the entire install.

## What's in this folder

| File | Role |
|---|---|
| `edit.js` | The editor panel UI + all interaction logic. Self-contained IIFE, zero external dependencies, injects its own CSS. Never loaded directly — `bootstrap.js` injects it on approved devices. |
| `bootstrap.js` | Decides whether the editor should load (IP allowlist, `aed:force` flag, `?edit=1` query, `Ctrl+Shift+E` chord), injects `edit.js` when the answer is yes, and wires up the optional footer toggle anchor. |
| `README.md` | This file. |

## Integration in a new site

**1. Copy the folder.**

Drop `public/editor/` into your new site's `public/` directory. Your build
tool should serve the two JS files at `/editor/edit.js` and `/editor/bootstrap.js`.

**2. Edit `bootstrap.js`.**

At the top of the file is a single `AED_CONFIG` block:

```js
var AED_CONFIG = {
  allowlist: ['162.202.41.44', '172.59.75.74'],  // your IPs
  editorScript: '/editor/edit.js',               // path the bootstrap injects
};
```

Update `allowlist` with the public IPs that should auto-load the editor.
Everyone else will still be able to opt-in via `Ctrl+Shift+E` or the
`?edit=force` URL — the allowlist is just for auto-activation.

**3. Load `bootstrap.js` from your site's layout.**

Somewhere in your base layout (typically before `</body>`), add:

```html
<script defer src="/assets/builder/editor/bootstrap.js"></script>
```

That's the whole install. The editor is now available site-wide.

**4. (Optional) Add a footer toggle anchor.**

If you want a visible "Edit / Exit editor" link that appears based on state,
drop this anywhere in your markup:

```html
<a data-footer-edit>Edit</a>
```

`bootstrap.js` finds it by attribute, updates the label dynamically (Edit /
Exit editor), and handles the click to enter/exit editing. No wiring required
on your end.

## Activation paths (how editing gets turned on)

| Path | Behavior |
|---|---|
| User's IP matches `allowlist` | Editor auto-loads on every page. |
| `localStorage['aed:force'] === '1'` | Editor auto-loads regardless of IP. Set this by visiting `?edit=force`. Clear with `?edit=unforce`. |
| `Ctrl+Shift+E` (or `Cmd+Shift+E`) | Loads the editor for this browser, persisted via `localStorage['aed:on']`. Only registered for allowlisted/forced users. |
| `?edit=1` / `?edit=on` | Sets `aed:on=1` then reloads. If the user is also allowlisted or forced, this triggers a load; otherwise it's a no-op. |
| `[data-footer-edit]` click | Exits in place (when loaded) or toggles via URL (when flags are set but editor isn't loaded). |

## Debugging

Visit `?edit=debug` to turn on console logging for the bootstrap. Logs appear
prefixed with `[aed]`. Clear with `?edit=nodebug`.

## localStorage / sessionStorage keys

Editor state namespace is `aed:*`:

| Key | Storage | Purpose |
|---|---|---|
| `aed:on` | localStorage | User has activated the editor on this browser |
| `aed:force` | localStorage | Skip IP check — always activate |
| `aed:debug` | localStorage | Enable bootstrap console logging |
| `aed:active` | localStorage | Editor is currently running in active (enabled) state |
| `aed:pos` | localStorage | Panel position on screen |
| `aed:collapsed` | localStorage | Panel collapse state |
| `aed:globals` | localStorage | Site-wide markers (edits that apply everywhere the same component renders) |
| `aed:globals:migrated` | localStorage | One-time migration flag |
| `aed:addons-pending` | localStorage | Pending addon enable/disable toggles from the Addons modal (survives page nav; cleared after the patch is copied + applied) |
| `aed:image-library` | localStorage | Pasted image URLs (one entry per URL: `{ url, addedAt }`) queued for the brand gallery manifest. Bumps the panel count, surfaces a panel "Image library" group, and ships under `payload.imageLibrary`. Cleared by Clear Session. The Images modal merges this **staged** set with the **shipped** brand gallery (`window.AED_GALLERY`, inlined from `content/brands/<brand>/gallery.json` by Base.astro) so the Library view reflects every available image — only staged URLs ride out in the payload. |
| `aed:session` | sessionStorage | Per-tab element-level edits for this page |
| `aed:pageNotes` | sessionStorage | Per-tab page-level notes (draft + committed) |

All keys are namespaced with `aed:` so they won't collide with host-site storage.

## Copy-patch clipboard format (v0.31.31+)

When the user clicks **Copy patch** in the editor, the clipboard gets a
**markdown-prefixed prompt view** followed by the full audit JSON in a fenced
code block. The prompt view is a lean per-request rendering — one `###` block
per staged item, focused on the user's `note` text and minimum targeting
context — so when the user pastes into Claude, the agent sees the *request*
first, not 30 KB of disambiguation context. The JSON below is the
durable/replay artifact and follows `schemaVersion=3`.

```
# gomks builder · 3 requests
brand: arich · captured on: /about/ · 2026-04-30T18:42:11Z · editor v0.31.31 · viewport: 1920×1080 (xl)

Apply each request below in order. Full audit JSON follows. The agent
processing guide lives in `arich-astro/public/assets/builder/editor/edit.js`
(`PAYLOAD_INSTRUCTIONS`); read it before applying anything.

## Per-target requests

### Edit · /about/ · hero#0 · variant=H · "Welcome to the future of X"
> sharpen the opener
selector: .lead
text: "Old text…" → "New text…"

### Page note · /about/
> Split this into two rows on mobile

---

```json
{ ...full payload object... }
```
```

**Processing-rule source of truth: the editor's `PAYLOAD_INSTRUCTIONS` constant
(search [edit.js](./edit.js)).** Every patch carries a one-line
`agentInstructionsRef` pointer instead of the full doc body — the agent reads
the canonical text from source. Earlier versions (≤0.31.30) inlined the
~120-line array as `payload.agentInstructions`; that field is gone in 0.31.31+.

The README example below is a snapshot of the JSON shape, not the source of
truth. New keys (section injections / removals, imageFeedback,
imageSelections, addonFeedback, editorFeedback, siteMode, etc.) are
documented in `PAYLOAD_INSTRUCTIONS`.

```json
{
  "meta": {
    "schemaVersion": 3,
    "editorVersion": "0.31.3",
    "editorFile": "assets/builder/editor/edit.js",
    "sourceRepo": "arich-astro",
    "page": { "path": "/about/", "title": "About · Example", "url": "https://example.com/about/", "lang": "en" },
    "viewport": { "w": 1920, "h": 1080, "dpr": 1, "breakpoint": "xl" },
    "instructions": "Front-end feedback payload from the gomks builder — process each top-level key…"
  },
  "origin": "https://example.com",
  "timestamp": "2026-04-19T01:17:37.042Z",
  "brand": "arich",
  "session": {
    "/about/": [
      {
        "tag": "p",
        "selector": ".lead",
        "original": "Old text…",
        "updated": "New text…",
        "note": "sharpen the opener",
        "global": true,
        "scope": "site-wide",
        "elementPath": "main > section.hero > div.intro > p.lead",
        "sectionType": "hero",
        "sectionIndex": 0,
        "sectionVariant": "bold",
        "classList": ["lead", "text-xl"],
        "id": null,
        "ariaLabel": null,
        "role": null,
        "nearbyHeading": "Welcome to the future of X",
        "variants": { "hero": "bold" },
        "imageRequested": false
      }
    ]
  },
  "pageNotes": {
    "/about/": [{
      "text": "Split this into two rows on mobile",
      "at": "2026-04-23T14:07:33.000Z",
      "url": "https://example.com/about/#team",
      "pageTitle": "About · Example",
      "viewport": { "w": 414, "h": 896, "dpr": 2, "breakpoint": "xs" },
      "lang": "en",
      "editorVersion": "0.20.1",
      "scrollY": 1840,
      "activeModal": null,
      "referrer": "https://example.com/",
      "variants": {},
      "imageRequested": false
    }]
  },
  "sectionOverrides": {
    "/about/": [
      {
        "type": "features", "index": 1,
        "theme": "dark", "accent": "#6366f1",
        "sectionHeading": "What we offer",
        "sectionClassList": ["section", "py-24"],
        "sectionId": null
      }
    ]
  },
  "variants": { "hero": "bold", "cta": "compact" },
  "theme": { "theme.colors.accent": "#6366f1", "theme.colors.accentRgb": "99, 102, 241" },
  "addons": { "enable": ["scrollspy"], "disable": ["confetti"] },
  "addonsConfig": { "announcement-bar": { "message": "Summer sale" } },
  "addonFeedback": { "scrollspy": "need active-section color tweak" },
  "editorFeedback": { "meta": { "…" : "…" }, "entries": { "ADDON-ROW": { "…": "…" } } },
  "imageLibrary": ["https://example.com/hero.jpg"],
  "variantConfigs": [{ "id": "…", "name": "Bold Green", "snapshot": { "…": "…" } }]
}
```

### `meta` — always present

- `schemaVersion` (integer) — bump when the shape changes in a
  backwards-incompatible way. Current: **3** (v3 added per-entry `id` /
  `likelyTarget` / `followUpTo` / `kind` / `expected` / `appliesTo` /
  `textChanged` / `targetRect` enrichment to session entries and pageNotes).
- `editorVersion` — VERSION constant of the editor that produced the patch.
- `editorFile` / `sourceRepo` — canonical file to edit and repo root.
- `page` — the page the user was viewing when they hit Copy (`path`,
  `title`, `url`, `lang`).
- `viewport` — `{ w, h, dpr, breakpoint }`. If feedback is responsive-only,
  honour the breakpoint.
- `instructions` — *removed in 0.31.31.* Earlier versions inlined the
  processing guide here (and again as a top-level `agentInstructions` array).
  The full guide now lives only in source: read `PAYLOAD_INSTRUCTIONS` in
  [edit.js](./edit.js). The clipboard prompt view (above) tells the agent
  to do this; the payload also carries a one-line `agentInstructionsRef`
  pointer.

### `session[pathname][]` — per-element edits (enriched)

Each entry targets an element via `selector`. New fields (v2) beyond the
basic tag / text delta:

| Field | Purpose |
|---|---|
| `elementPath` | Short DOM breadcrumb (up to 5 ancestors) for disambiguation |
| `sectionType` | Owning `[data-section-type]` value (e.g. `"hero"`) |
| `sectionIndex` | Which instance of that section type on the page |
| `sectionVariant` | Live `data-<type>-variant` on `<html>` at edit time |
| `classList` | Element's classes (editor internals stripped) |
| `id` | Element id if any |
| `ariaLabel` / `role` | A11y hooks for semantic targeting |
| `nearbyHeading` | Closest heading text — anchors "this paragraph" references |
| `dataAttrs` | Author-authored `data-*` attrs (editor internals excluded) |

`global: true` still means "apply across every page that renders this
component — edit the shared component, not the page content."

### `sectionOverrides[pathname][]` — visual section tweaks

Existing fields: `type`, `index`, `theme`, `accent`, `parallax`,
`parallaxUrl`, `disabled`. For rows on the current page, the agent now also
gets:

| Field | Purpose |
|---|---|
| `sectionHeading` | Closest heading text inside the section |
| `sectionClassList` | Section wrapper classes |
| `sectionId` | Section wrapper id if any |

### `pageNotes[pathname][]` — page-level comments (enriched)

Free-form page-level notes, now capturing the same rich context as
session entries and editor feedback. Each note:

| Field | Purpose |
|---|---|
| `text` | The user's raw request |
| `at` | ISO timestamp when the note was committed |
| `url` | Full URL at capture (includes query/hash — matters when pathnames alone aren't unique) |
| `pageTitle` | `document.title` at capture — semantic label for the page |
| `viewport` | `{ w, h, dpr, breakpoint }` — responsive-only feedback should be honoured only at that breakpoint |
| `lang` | `<html lang>` at capture |
| `editorVersion` | Editor version that saved the note — lets the agent detect feedback that predates a recent refactor |
| `variants` | Site-wide `data-<type>-variant` attrs live at capture. Variant-specific page feedback only applies when that variant is active |
| `imageRequested` | `true` if the user wants a brand-gallery image alongside this note |
| `activeModal` | Which editor modal was open at capture (rare for page notes; usually `null`) |
| `scrollY` | Vertical scroll position at capture — anchors "this section" references |
| `referrer` | `document.referrer` if set |

Apply to the page content file / component that renders the pathname.
Legacy notes missing any of these fields should degrade gracefully.

### `variants`, `theme`, `addons`, `addonsConfig`, `addonFeedback`, `imageLibrary`, `variantConfigs`

Unchanged shapes. See `meta.instructions` for per-key processing rules and
expected source-of-truth file paths.

`imageLibrary` specifically is a flat `string[]` of URLs the user pasted
into the Images modal's "Add image URLs to library" textarea. The agent
should append these to `content/brands/<brand>/gallery.json`. Persisted
under `localStorage['aed:image-library']`; staged URLs render as a panel
"Image library" group and are cleared by Clear Session alongside every
other pending bucket (added v0.31.3 — earlier builds cleared the panel
display but left URLs in localStorage, which read to users as "Clear log
didn't work for image library entries").

The Images modal Library view also surfaces the **shipped** brand gallery
read from `window.AED_GALLERY` (inlined by Base.astro from
`content/brands/<brand>/gallery.json`). Shipped entries render with a
SHIPPED badge and no remove button — to remove them, edit gallery.json in
source. Only the staged paste-buffer ships out in the payload, so brand
URLs don't double-import (added v0.31.8 — before this the Library was
empty after Clear Session even when gallery.json held dozens of URLs).

### `siteMode` — site-wide theme mode (Vibrant / Dark / Light)

Selecting a mode in the Theme modal's Site Mode tab stages this key.

```json
"siteMode": {
  "mode": "dark",
  "previousMode": "vibrant",
  "brandConfigField": "theme.mode",
  "storageKey": "theme",
  "htmlAttr": "data-theme",
  "appliedLive": true,
  "at": "2026-04-23T21:34:12.000Z"
}
```

The three modes map 1:1 to the public Nav's `#themeToggle` buttons:

- **Vibrant** — authored section rhythm (contrasting bands).
- **Dark** — uniform dark palette flattened across every section.
- **Light** — uniform light palette flattened across every section.

**Processing:** update `content/brands/<brand>/brand.json` at the
`theme.mode` path to the selected `mode` value. The editor has already
applied the change to the live page via `localStorage['theme']` +
`<html data-theme>` — but that persistence is per-visitor. This key flips
the **default** every new visitor inherits before they override it.

`previousMode` is the mode that was live before the user first toggled
(snapshotted at first-change and held constant across subsequent
toggles). Useful for change-log / audit entries.

### `editorFeedback`

Self-documenting sub-payload for meta-feedback on the editor UI. Contains
its own `meta.instructions`. See the "editorFeedback" section below for
the full schema.

### `editorFeedback` — meta-feedback on the editor UI itself

When the user is in debug mode (Ctrl+Shift+D) every labeled region of the
editor becomes tappable. Tapping a label opens a native prompt asking for
feedback about **that specific editor-UI element**. Saved notes ride along
in the next **Copy patch** under a top-level `editorFeedback` key with a
structured shape intended for an AI agent to process editor adjustments,
feature additions, and fixes.

```json
"editorFeedback": {
  "meta": {
    "editorVersion": "0.18.1",
    "editorFile": "assets/builder/editor/edit.js",
    "sourceRepo": "arich-astro/public/assets/builder/editor/edit.js",
    "instructions": "Editor UI feedback captured via the built-in debug overlay…"
  },
  "entries": {
    "ADDON-ROW": {
      "selector": ".aed-addon-row",
      "color": "purple",
      "category": "addons",
      "notes": [
        {
          "text": "Move Enable-all / Disable-all into the gear menu",
          "at": "2026-04-23T14:02:18.000Z",
          "page": "/about/",
          "url": "https://example.com/about/",
          "viewport": { "w": 1920, "h": 1080, "dpr": 1, "breakpoint": "xl" },
          "activeModal": "addons",
          "activeVariants": {},
          "editorVersion": "0.18.1"
        }
      ]
    }
  }
}
```

**Processing guide for the agent:**

1. **File**: every editor-UI change happens in
   `assets/builder/editor/edit.js` — a single-file IIFE that injects its
   own CSS, HTML, and logic.
2. **Locate the code**: grep `edit.js` for each entry's `selector` (class
   name or data-attribute). That finds both the HTML that emits the
   element and the CSS that styles it.
3. **Apply each note's `text`** as the feature/fix/adjustment request. Use
   the `category` + `activeModal` + `activeVariants` context to stay in
   the right feature area.
4. **Bump `VERSION`** at the top of edit.js before shipping.
5. **Source of truth** is `arich-astro/public/assets/builder/editor/edit.js`;
   a build deploys to every Mountain Duck mount.
6. If introducing a new labeled region while fixing something, append an
   entry to the `DEBUG_REGIONS` array with a unique UPPERCASE label text,
   the CSS selector, and optional `color`/`outside`/`off`. Drilldown
   (specific) entries live AFTER generic ones — last match wins per
   element.

**Categories** (value of `entries[*].category`): `panel`, `tools-menu`,
`page-note`, `toolbar`, `note-popup`, `section-picker`, `section-frame`,
`pos-picker`, `modal-chrome`, `addons`, `theme`, `variant-customizer`,
`sitemap`, `images`, `config`, `info-drawer`.

**Storage**: `localStorage['aed:editor-feedback']`. Cleared by
Clear Session alongside every other pending bucket.

## Addons panel

The toolbar's grid icon opens a panel listing every addon in
`public/addons/` alongside its current enable/disable state for this brand.
Flip a toggle and the change is staged in `localStorage['aed:addons-pending']`
and gets bundled into the next **Copy patch**. The Claude agent processing
the patch updates `arich-source/content/brands/<brand>/site.json`'s `addons`
map accordingly.

**Data source.** The panel reads `/assets/addons/index.json`, which the build
pipeline writes via [scripts/build-addon-index.mjs](../../../scripts/build-addon-index.mjs).
Shape:

```json
{
  "brand": "arich",
  "generatedAt": "2026-04-19T07:33:43.152Z",
  "addons": [
    { "name": "announcement-bar", "description": "…", "enabled": true, "hasConfig": true, "assets": {…} },
    …
  ]
}
```

The index is regenerated on every `npm run build` / `build:fast` — the panel
is always in sync with what's actually enabled in the current deploy.

## Versioning

The editor's version string is a single `VERSION` constant at the top of
`edit.js`. Bump it when you ship a change. The number is displayed in the
panel header and in the footer of the quick-reference drawer inside the panel.
