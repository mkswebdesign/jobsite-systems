# color-roll

Visitor-facing accent randomizer for demo pages. Renders a floating
"Try a new color" pill that lets unauthenticated visitors roll a new
accent color across a configured path subtree.

Distinct from the **builder's** roll — that one is admin-only, persists
to `aed:theme-pending` for export, and rewrites theme.json. This addon
is read-only against the brand: it only sets CSS custom properties on
`<html>` and persists in `sessionStorage`. Visitor activity never
leaves their browser, never touches site config.

## When to use

Demo pages where you want visitors to feel the brand's flexibility
without giving them the keys to the actual brand. Each demo gets its
own scope prefix, so a rolled color on `/demo/flinthills/` doesn't
follow the visitor to `/services/` (the real brand site).

## Behavior

- **Path-scoped.** The button only mounts when `location.pathname`
  matches `scopePrefix` (exact base, with or without trailing slash,
  or any sub-path). Off-scope pages never see the button or run the
  apply step.
- **Session-scoped.** Rolled palette persists in `sessionStorage` keyed
  by `aed:color-roll:<scopePrefix>`. Closing the tab resets to brand.
- **Reset affordance.** Once the visitor has rolled at least once, a
  small "Reset" pill appears above the main button. Hidden by default.

## Tokens overridden

The roll algorithm derives a single hue and writes seven tokens on
`:root`:

| Token | Source |
| --- | --- |
| `--accent` | universal arich-astro accent |
| `--accent-rgb` | for `rgba(var(--accent-rgb), x)` shadows / glows |
| `--accent-hover` | hover-brightened sibling |
| `--accent-hover-rgb` | hover RGB |
| `--brand-surface` | landscape-systems contrast token |
| `--brand-accent-on-dark` | landscape-systems accent-as-text on dark |
| `--brand-accent-readable` | landscape-systems accent-as-text on light |

Reset removes all seven properties via `removeProperty()` so the
brand's authored values reassert from the cascade.

## Configuration

Enable in the brand's `site.json`:

```json
"addons": {
  "color-roll": {
    "enabled": true,
    "json": [
      {
        "id": "aed-color-roll-config",
        "data": {
          "scopePrefix": "/demo/flinthills/",
          "label":       "Try a new color",
          "resetLabel":  "Reset",
          "hint":        "Demo only — your visit only"
        }
      }
    ]
  }
}
```

| Field | Default | Notes |
| --- | --- | --- |
| `scopePrefix` | `""` (empty = always show) | Path prefix the button activates on. Match: exact base, exact base + `/`, or any sub-path of `<prefix>/`. |
| `label` | `Try a new color` | Main button label. |
| `resetLabel` | `Reset` | Reset link label. |
| `hint` | `Demo only — your visit only` | Sublabel under the main label. Hidden on very narrow screens (<380px). Pass an empty string to omit. |

## Public API

```js
window.__colorRoll.roll();   // roll a new color
window.__colorRoll.reset();  // restore brand defaults
```

Available only on in-scope pages (the addon early-returns elsewhere).

## Cascade interaction with the gomks builder

When an admin views a demo page with the gomks builder enabled, both
this addon AND the builder may write to the same `:root` properties.
The addon writes on `DOMContentLoaded`; the builder restores from
`aed:theme-cssvars` in the page head. Whoever runs LAST wins. In
practice this addon mounts later, so the visitor-rolled color
visually wins on the demo. Builder export still works normally — the
admin's stage state lives in `aed:theme-pending`, untouched.
