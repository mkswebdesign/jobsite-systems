# FinalCta

Closing conversion band at the end of a page. Every page that composes via `sections[]` typically ends with one.

- **`type`:** `finalCta`
- **Component:** `FinalCta.astro`
- **Schema:** `finalCtaSection` in `src/content/config.ts`
- **Used by:** all four brands

## Fields

| Field | Required | Notes |
|---|---|---|
| `type` | yes | Literal `"finalCta"` |
| `heading` | yes | Closing heading. Newlines render as line breaks. |
| `body` | yes | One- or two-sentence supporting copy. |
| `ctaPrimary` | yes | `{ label, href }` — the hard conversion ask. |
| `ctaSecondary` | no | `{ label, href }` — softer alternative (e.g., "see our process"). |
| `headshot` | no | Image URL, or `null` to explicitly render no headshot. When present, the component lays out the text + face together. When `null` or omitted, the brand's `BrandMark` or `InitialsAvatar` renders instead (component decides based on brand config). |

## Variants

Declared as `data-section-variants="A:Default,B:Tall,C:Bold,D:Banner,E:Clean,F:Bare,G:Editorial,H:Split"`.

- **A (Default)** — standard centered CTA band.
- **B (Tall)** — increased vertical padding; makes the section dominant.
- **C (Bold)** — saturated accent background.
- **D (Banner)** — thin horizontal banner style.
- **E (Clean)** — no background, minimal chrome.
- **F (Bare)** — text-only, no buttons (use when secondary links live elsewhere).
- **G (Editorial)** — magazine-style quote framing for the body.
- **H (Split)** — text left, CTA right. **Implemented in `landscape-systems` CSS.**

## ⚠️ Variant `H` exceeds the current sanitizer cap

`Base.astro` sanitizes variant letters against `^[A-G]$` — `H` is silently dropped unless the regex is widened in **both** places in `Base.astro` (lines 156 and 173 at the time of writing). `landscape-systems` ships CSS for variant `H` using a different attribute path, but if you set `data-final-cta-variant="H"` via the editor or a page JSON override today, the sanitizer will drop it. See `variant_sanitizer_cap.md` memory.

If you use variant `H`, either:
1. Widen both `Base.astro` regexes to `^[A-H]$`, or
2. Consolidate `H` into one of the A–G slots.

## Behavior notes

- **No client-side JS.**
- **Responsive images:** optional `headshot` loads with `loading="lazy"`.
- **Accessibility:** no ARIA attributes on the component itself — relies on semantic heading + link elements. CTAs should have meaningful labels (avoid "click here").

## Brand override hints

```css
.final-cta { }
.final-cta__heading { }
.final-cta__cta--primary { }
.final-cta__cta--secondary { }
.final-cta[data-final-cta-variant='H'] { /* split layout */ }
```

## Example

See `content/_examples/sections.json` → `finalCta`.
