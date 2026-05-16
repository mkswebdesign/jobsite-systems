/*
 * Color Roll — visitor-facing accent randomizer for demo pages.
 *
 * Renders a floating "Try a new color" button on a configured path prefix
 * (e.g. /demo/flinthills/). Click rolls a random hue, derives a small
 * palette (accent / hover / readable-on-light), and applies it via
 * :root CSS custom properties. State persists in sessionStorage so the
 * rolled color follows the visitor across sub-pages of the same demo
 * but does not bleed across visits or across other site sections.
 *
 * Public API:
 *   window.__colorRoll.roll()    // roll a new color programmatically
 *   window.__colorRoll.reset()   // restore brand defaults
 *
 * Config (via JSON config block id "aed-color-roll-config"):
 *   {
 *     "scopePrefix": "/demo/flinthills/",
 *     "label":       "Try a new color",
 *     "resetLabel":  "Reset",
 *     "hint":        "Demo only — your visit only"
 *   }
 *
 * scopePrefix may also be an array of prefixes — each scope keeps an
 * independent rolled palette in sessionStorage so two demos under
 * /demo/<x>/ don't share a color. Example:
 *   "scopePrefix": ["/demo/flinthills/", "/demo/kc-snowplowing/"]
 *
 * See ./README.md.
 */
(function () {
  'use strict';

  var defaults = {
    scopePrefix: '',
    label:       'Try a new color',
    resetLabel:  'Reset',
    hint:        'Demo only — your visit only'
  };

  var config = Object.assign({}, defaults);
  (function loadConfig() {
    var el = document.getElementById('aed-color-roll-config');
    if (!el) return;
    try {
      var cfg = JSON.parse(el.textContent || '{}');
      Object.keys(cfg).forEach(function (k) { config[k] = cfg[k]; });
    } catch (_) {}
  })();

  // Returns the matched prefix string when path is in scope, null when not.
  // Accepts a single prefix string OR an array of prefix strings — each
  // matching prefix becomes its own storage key, so independent demos
  // keep independent rolled palettes.
  function matchScope(path, prefix) {
    if (!prefix) return '';
    var list = Array.isArray(prefix) ? prefix : [prefix];
    for (var i = 0; i < list.length; i++) {
      var p = String(list[i] || '');
      if (!p) continue;
      var bare = p.replace(/\/$/, '');
      if (path === bare || path === bare + '/' || path.indexOf(bare + '/') === 0) {
        return p;
      }
    }
    return null;
  }
  var matchedPrefix = matchScope(window.location.pathname, config.scopePrefix);
  if (matchedPrefix === null) return;

  var STORAGE_KEY = 'aed:color-roll:' + (matchedPrefix || 'global');

  // ---- Color math ----------------------------------------------------------
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var hue2rgb = function (p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  function pad2(s) { return s.length < 2 ? '0' + s : s; }
  function rgbToHex(rgb) { return '#' + rgb.map(function (n) { return pad2(n.toString(16)); }).join(''); }
  function rgbStr(rgb) { return rgb.join(', '); }

  // Roll a fresh palette. Mid-light L for the accent (matches the
  // landscape-systems lime baseline, ~0.59), brighter hover, and a
  // darkened readable sibling for accent-as-text on light surfaces.
  // The on-surface companion is a very-dark hued tone that pairs with
  // the mid-light surface for ~9:1 contrast (mirrors the brand's
  // baseline #b3d855 / #0b2f08 pairing).
  function rollPalette(prevHue) {
    var hue;
    var attempts = 0;
    do {
      hue = Math.floor(Math.random() * 360);
      attempts++;
    } while (typeof prevHue === 'number' && Math.abs(hue - prevHue) < 40 && attempts < 8);

    var sat         = 52 + Math.floor(Math.random() * 22); // 52-74%
    var lAccent     = 56 + Math.floor(Math.random() * 8);  // 56-64%
    var lHover      = Math.min(lAccent + 6, 70);
    var lReadable   = 30;                                  // dark text on light
    var lOnSurface  = 11;                                  // very dark text on rolled surface

    var accent     = hslToRgb(hue, sat, lAccent);
    var hover      = hslToRgb(hue, Math.min(sat + 6, 80), lHover);
    var readable   = hslToRgb(hue, Math.min(sat + 6, 80), lReadable);
    var onSurface  = hslToRgb(hue, Math.min(sat + 8, 78), lOnSurface);

    return {
      hue:           hue,
      accentHex:     rgbToHex(accent),
      accentRgb:     rgbStr(accent),
      hoverHex:      rgbToHex(hover),
      hoverRgb:      rgbStr(hover),
      readableHex:   rgbToHex(readable),
      readableRgb:   rgbStr(readable),
      onSurfaceHex:  rgbToHex(onSurface),
      onSurfaceRgb:  rgbStr(onSurface)
    };
  }

  // Tokens we override. The brand-* set is the canonical landscape-systems
  // contrast tokens; the --accent / --accent-hover set is the universal
  // arich-astro brand var that drives shadows, glows, focus rings;
  // --brand-on-surface(-rgb) carries dark text on the rolled surface and
  // is also re-bound to --accent-rgb inside primary-surface descendants
  // (footer variant F, primary-surface text policy), so rolling it makes
  // those scoped overrides track the rolled palette too.
  var TOKENS = [
    '--accent',
    '--accent-rgb',
    '--accent-hover',
    '--accent-hover-rgb',
    '--brand-surface',
    '--brand-on-surface',
    '--brand-on-surface-rgb',
    '--brand-accent-on-dark',
    '--brand-accent-readable',
    '--brand-accent-readable-rgb'
  ];

  function apply(p) {
    var root = document.documentElement;
    if (!p) {
      TOKENS.forEach(function (k) { root.style.removeProperty(k); });
      return;
    }
    // `!important` priority: brand.ts emits a `:root[data-theme="light"]`
    // colorBlock that redeclares --accent et al with the brand's static
    // lightColors hex. Inline normally wins on equal specificity, but in
    // light page mode the rolled tokens were observed staying at the brand
    // default ("rolled colors don't apply in light mode" — flinthills demo,
    // 2026-04-28). Setting these inline declarations as !important makes
    // them unambiguously trump any selector — light-mode colorBlock,
    // future per-section pins, anything.
    root.style.setProperty('--accent',                  p.accentHex,    'important');
    root.style.setProperty('--accent-rgb',              p.accentRgb,    'important');
    root.style.setProperty('--accent-hover',            p.hoverHex,     'important');
    root.style.setProperty('--accent-hover-rgb',        p.hoverRgb,     'important');
    root.style.setProperty('--brand-surface',           p.accentHex,    'important');
    root.style.setProperty('--brand-on-surface',        p.onSurfaceHex, 'important');
    root.style.setProperty('--brand-on-surface-rgb',    p.onSurfaceRgb, 'important');
    root.style.setProperty('--brand-accent-on-dark',    p.accentHex,    'important');
    root.style.setProperty('--brand-accent-readable',   p.readableHex,  'important');
    root.style.setProperty('--brand-accent-readable-rgb', p.readableRgb, 'important');
  }

  function save(p) { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (_) {} }
  function load()  { try { var r = sessionStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch (_) { return null; } }
  function clear() { try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {} }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // ---- DOM -----------------------------------------------------------------
  var btn      = null;
  var swatch   = null;
  var resetBtn = null;
  var current  = null;

  function build() {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aed-color-roll';
    btn.setAttribute('aria-label', config.label + ' — ' + config.hint);
    btn.setAttribute('title', config.label + '. ' + config.hint + '.');
    btn.innerHTML =
      '<span class="aed-cr-swatch" aria-hidden="true"></span>' +
      '<span class="aed-cr-text">' +
        '<span class="aed-cr-label">' + escapeHtml(config.label) + '</span>' +
        (config.hint ? '<span class="aed-cr-hint">' + escapeHtml(config.hint) + '</span>' : '') +
      '</span>' +
      '<span class="aed-cr-icon" aria-hidden="true">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M3 12a9 9 0 1 0 9-9"/>' +
          '<path d="M12 3v4"/>' +
          '<path d="M21 7l-4 1"/>' +
        '</svg>' +
      '</span>';
    swatch = btn.querySelector('.aed-cr-swatch');

    resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'aed-color-roll-reset';
    resetBtn.textContent = config.resetLabel;
    resetBtn.setAttribute('aria-label', 'Reset to original brand colors');
    resetBtn.hidden = true;

    btn.addEventListener('click', doRoll);
    resetBtn.addEventListener('click', doReset);

    document.body.appendChild(btn);
    document.body.appendChild(resetBtn);
  }

  function updateSwatch(hex) {
    if (!swatch) return;
    if (hex) swatch.style.background = hex;
    else     swatch.style.background = '';
  }

  function doRoll() {
    var p = rollPalette(current && current.hue);
    apply(p);
    save(p);
    current = p;
    updateSwatch(p.accentHex);
    if (resetBtn) resetBtn.hidden = false;
    btn.classList.remove('is-rolling');
    void btn.offsetWidth;
    btn.classList.add('is-rolling');
  }

  function doReset() {
    apply(null);
    clear();
    current = null;
    updateSwatch(null);
    if (resetBtn) resetBtn.hidden = true;
  }

  // Resolve initial palette and apply it BEFORE DOMContentLoaded so the
  // first paint already shows the rolled color (no flash of brand lime).
  // documentElement is parsed by the time this addon script runs, so
  // setting inline CSS vars here is safe and wins the cascade.
  var saved = load();
  if (saved && saved.accentHex) {
    current = saved;
  } else {
    // First visit to this demo: roll a fresh color so the visitor lands
    // on a non-default palette and immediately understands the site is
    // re-paintable. Persist so sub-page navigation keeps the same color.
    current = rollPalette();
    save(current);
  }
  apply(current);

  function init() {
    build();
    updateSwatch(current.accentHex);
    if (resetBtn) resetBtn.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__colorRoll = {
    roll:  doRoll,
    reset: doReset
  };
})();
