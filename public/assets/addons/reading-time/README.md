# Reading Time — portable word-count → "5 min read" stamp

A drop-in folder. Drops a clock-icon + "N min read" stamp wherever you
mark `<span data-aed-reading-time>`. Counts words inside a configured
scope (default `article, main`), strips out scripts / styles / nav /
footer / aside before counting.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `reading-time.css` | Inline icon + label styling. Theme-aware. |
| `reading-time.js` | Word-count, scope walker, format string, hover-title with full word count. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "reading-time": { "enabled": true } }
```

## Markup

```html
<!-- Default: counts words in <article>, 220 WPM -->
<span data-aed-reading-time></span>

<!-- Custom scope -->
<span data-aed-reading-time data-aed-rt-scope=".fg-content"></span>

<!-- Slower reader (e.g. for technical posts) -->
<span data-aed-reading-time data-aed-rt-wpm="180"></span>

<!-- Custom output template ({n} = minute count) -->
<span data-aed-reading-time data-aed-rt-format="{n}-minute read"></span>

<!-- Without the leading clock icon -->
<span data-aed-reading-time data-aed-rt-no-icon></span>
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-reading-time` | required | Opt-in marker — stamp lands inside this element |
| `data-aed-rt-scope` | `article, main` | CSS selector for the content to count |
| `data-aed-rt-wpm` | `220` | Words per minute — average adult reading speed for English prose |
| `data-aed-rt-min` | `1` | Minimum minutes to display (so a one-paragraph post says "1 min read", not "0") |
| `data-aed-rt-format` | `{n} min read` | Output template — `{n}` is replaced with the minute count |
| `data-aed-rt-no-icon` | absent | Skip the leading clock icon |

## Word-count rules

- Counts whitespace-separated tokens via `text.match(/\S+/g)`.
- Strips before counting: `<script>`, `<style>`, `<nav>`, `<footer>`,
  `<aside>`, `.aed-toc`, `[data-aed-versions]`, and the marker itself
  (so the stamp doesn't recursively count "5 min read").
- Falls back to `<body>` (with the same strip rules) when the scope
  selector doesn't match anything.
- The actual word count is exposed as a `title` attribute on the stamp
  for hover inspection, and bundled into the `aria-label`.

## Behavior

- **Single-pass**: counts at boot. Doesn't re-count if content changes.
  Call `__readingTime.refresh()` to re-stamp after dynamic insert.
- **Theme-aware**: muted text color via `--text-muted`.
- **Print mode**: prints as inline text (no special handling needed).

## Public API

```js
window.__readingTime.refresh()                      // re-scan after dynamic insert
window.__readingTime.estimate('article', 220)       // → { minutes, words }
```

## Versioning

`VERSION` constant lives at the top of `reading-time.js`.
