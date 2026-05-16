# Dropzone — portable drag-and-drop file input

A drop-in folder. Wraps any opted-in `<input type="file"
data-aed-dropzone>` with a styled drop zone. Drag files onto it or
click to browse. Native input preserved — forms, validation, and the
File API all work exactly as authored.

## What's in this folder

| File | Role |
|---|---|
| `addon.json` | Manifest. |
| `dropzone.css` | Drop zone styling, drag-over state, file list, error banner. Theme-aware. |
| `dropzone.js` | Wrap, drag/drop handling, file list render, max-size + max-files validation. |
| `README.md` | This file. |

## Integration

Enable in `site.json`:

```json
"addons": { "dropzone": { "enabled": true } }
```

## Markup

```html
<input type="file" data-aed-dropzone name="attachment">

<!-- With validation + custom labels -->
<input type="file" data-aed-dropzone
       name="files"
       accept="image/*,.pdf"
       multiple
       data-aed-dz-headline="Drop files or <strong>browse</strong>"
       data-aed-dz-hint="PNG, JPG, PDF — up to 10 MB"
       data-aed-dz-max-size="10485760"
       data-aed-dz-max-files="5">
```

## Per-element attributes

| Attribute | Default | Purpose |
|---|---|---|
| `data-aed-dropzone` | required | Opt-in marker |
| `data-aed-dz-headline` | `Drop files here or <strong>browse</strong>` | Main label (allows `<strong>`) |
| `data-aed-dz-hint` | `""` | Small subtext below the headline (escaped) |
| `data-aed-dz-max-size` | `0` (off) | Max bytes per file |
| `data-aed-dz-max-files` | `0` (off) | Max files when `multiple` |
| `accept`, `multiple`, `name`, `required` | (native) | Standard `<input type="file">` attributes — preserved |

## Behavior

- **Native preservation**: the addon wraps the input in a `<label>`
  area but never replaces it. The original `<input type="file">`
  remains in the DOM, fully accessible to forms, FormData, etc.
- **Drag-and-drop**: dropping files on the area assigns them to the
  input via `DataTransfer.files` and dispatches a `change` event so
  any framework or `/forms/` listener picks them up.
- **Validation**: file-size and file-count limits checked against
  selections from both clicks and drops. Failed validation shows an
  inline error banner and clears the selection.
- **File list**: each selected file shows name + human-readable size
  + a remove button (rebuilds the input's `FileList` minus that file).
- **Reduced motion**: dragover scale-bump disabled.

## Pairs with `/forms/`

When inside a `<form data-aed-form>`, the dropzone's files are picked
up by the form addon's `FormData` automatically — no extra wiring.
The error banner the dropzone shows is independent of the form's
success/error UI.

## Public API

```js
window.__dropzone.refresh()                  // re-scan after dynamic insert
window.__dropzone.getFiles(inputElement)     // → File[]
```

## Versioning

`VERSION` constant lives at the top of `dropzone.js`.
